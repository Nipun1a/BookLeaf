import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { openDatabase, seed } from '../server/db';
import { createApp } from '../server/app';
import { classify, draft, fallbackClassification } from '../server/ai';

test('author/admin lifecycle, access isolation, validation and private-note protection',async()=>{
  delete process.env.ANTHROPIC_API_KEY;
  const db=openDatabase(':memory:');seed(db);
  const server=createApp(db).listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address() as {port:number};const base=`http://127.0.0.1:${address.port}/api`;
  async function request(path:string,method='GET',body?:unknown,cookie=''){
    const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
  }
  try {
    assert.equal((await request('/books')).status,401);
    assert.equal((await request('/auth/login','POST',{email:'priya.sharma@email.com',password:'wrong'})).status,401);
    const login=async(email:string)=>{const r=await request('/auth/login','POST',{email,password:'BookLeaf123!'});assert.equal(r.status,200);return r.cookie;};
    const author=await login('priya.sharma@email.com'),other=await login('rohit.kapoor@email.com'),admin=await login('admin@bookleaf.com');
    const books=await request('/books','GET',undefined,author);
    assert.deepEqual(books.data.books.map((b:any)=>b.book_id),['BK001','BK002']);
    assert.equal((await request('/books','GET',undefined,admin)).data.books.length,18);
    assert.equal((await request('/tickets','POST',{book_id:'BK003',subject:'Wrong book',description:'Testing isolation'},author)).status,400);
    assert.equal((await request('/tickets','POST',{subject:' ',description:'Invalid subject'},author)).status,400);
    const created=await request('/tickets','POST',{book_id:'BK001',subject:'Royalties overdue for 6 months',description:'Please review my pending royalty payment.'},author);
    assert.equal(created.status,201);const id=created.data.id;
    assert.equal((await request('/tickets/'+id,'GET',undefined,other)).status,404);
    assert.equal((await request('/tickets','GET',undefined,other)).data.tickets.length,0);
    assert.equal((await request('/tickets/'+id,'PATCH',{status:'Resolved'},author)).status,403);
    const detail=await request('/tickets/'+id,'GET',undefined,admin);
    assert.equal(detail.data.ticket.category,'Royalty & Payments');assert.equal(detail.data.ticket.priority,'High');assert.equal(detail.data.ticket.ai_source,'Rules fallback');
    const generated=await request('/tickets/'+id+'/draft','POST',{},admin);
    assert.match(generated.data.text,/1,000/);assert.match(generated.data.source,/template/);
    const cached=await request('/tickets/'+id+'/draft','POST',{},admin);assert.equal(cached.data.text,generated.data.text);
    assert.equal((await request('/tickets/'+id+'/messages','POST',{body:'Private finance investigation',internal:true},admin)).status,201);
    assert.equal((await request('/tickets/'+id+'/messages','POST',{body:'Thank you. We will investigate within 48 hours.'},admin)).status,201);
    assert.equal((await request('/tickets/'+id,'PATCH',{status:'In Progress',category:'ISBN & Metadata Issues',priority:'Critical',assigned_to:'me'},admin)).status,200);
    const updated=await request('/tickets/'+id,'GET',undefined,admin);
    assert.equal(updated.data.ticket.assigned_to,'ADMIN001');assert.equal(updated.data.ticket.ai_draft,'');assert.equal(updated.data.messages.length,2);
    const publicDetail=await request('/tickets/'+id,'GET',undefined,author);
    assert.equal(publicDetail.data.ticket.status,'In Progress');assert.equal(publicDetail.data.messages.length,1);assert.equal(publicDetail.data.ticket.ai_draft,undefined);assert.doesNotMatch(JSON.stringify(publicDetail.data),/Private finance investigation/);
    assert.equal((await request('/tickets?priority=Critical&status=In%20Progress','GET',undefined,admin)).data.tickets.length,1);
    assert.equal((await request('/tickets?from=2026-12-01&to=2026-01-01','GET',undefined,admin)).status,400);
    assert.equal((await request('/tickets?status=Invalid','GET',undefined,admin)).status,400);
    assert.equal((await request('/tickets?priority=Low','GET',undefined,admin)).data.tickets.length,0);
    const csrf=await fetch(base+'/tickets/'+id,{method:'PATCH',headers:{Cookie:admin,'Content-Type':'application/json',Origin:'https://evil.example'},body:JSON.stringify({status:'Closed'})});assert.equal(csrf.status,403);
    assert.equal((await request('/auth/logout','POST',{},author)).status,200);assert.equal((await request('/books','GET',undefined,author)).status,401);
    assert.equal((db.prepare('SELECT count(*) AS n FROM authors').get() as any).n,10);
  } finally{await new Promise<void>(resolve=>server.close(()=>resolve()));db.close();}
});

test('AI classification and drafts validate provider output and degrade on provider failures',async()=>{
  const originalFetch=globalThis.fetch;const originalKey=process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY='test-only-key';
  try {
    globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:'text',text:'{"category":"Printing & Quality","priority":"High"}'}]}),{status:200});
    assert.deepEqual(await classify('Misprint','Blurry pages'),{category:'Printing & Quality',priority:'High',source:'AI'});
    globalThis.fetch=async()=>new Response(JSON.stringify({content:[{type:'text',text:'{"category":"invented","priority":"invalid"}'}]}),{status:200});
    assert.equal((await classify('Wrong ISBN','A different ISBN is listed.')).source,'Rules fallback');
    globalThis.fetch=async()=>new Response('Rate limited',{status:429});
    assert.equal((await classify('Payment overdue','6 months without royalty')).priority,'High');
    assert.match((await draft({subject:'Print issue',description:'Binding defect',category:'Printing & Quality'},'Priya Sharma')).text,/free reprint/);
    globalThis.fetch=async()=>{throw new Error('Network failure');};
    assert.equal((await classify('Update author bio','Please help')).source,'Rules fallback');
    assert.equal(fallbackClassification('My book is stuck in typesetting').category,'Book Status & Production Updates');
  }finally{globalThis.fetch=originalFetch;if(originalKey)process.env.ANTHROPIC_API_KEY=originalKey;else delete process.env.ANTHROPIC_API_KEY;}
});
