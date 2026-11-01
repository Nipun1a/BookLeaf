import express, { type Request, type Response, type NextFunction } from 'express';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { z, ZodError } from 'zod';
import { checkPassword } from './db';
import { classify, draft } from './ai';
import { categories, priorities, statuses, type Book, type Ticket, type User } from './domain';

declare global { namespace Express { interface Request { user:User; } } }
class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
const text=(max:number)=>z.string().trim().min(1).max(max);
export function createApp(db:DatabaseSync) {
  const app=express();
  app.disable('x-powered-by');
  app.use(express.json({limit:'32kb'}));
  app.use('/api',(_req,res,next)=>{res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});next();});
  // SameSite cookies plus same-origin checks protect cookie-authenticated mutations.
  app.use('/api',(req,_res,next)=>{
    const origin=req.get('origin');
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&origin&&new URL(origin).host!==req.get('host')) return next(new HttpError(403,'Cross-origin requests are not allowed.'));
    next();
  });
  const token=(req:Request)=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('bookleaf_session='))?.slice(17);
  const cookieOptions={httpOnly:true,sameSite:'strict' as const,secure:process.env.COOKIE_SECURE==='true',path:'/'};
  const attempts=new Map<string,{count:number;until:number}>();
  app.post('/api/auth/login',(req,res)=>{
    const input=z.object({email:z.email().max(254).transform(v=>v.toLowerCase()),password:text(200)}).parse(req.body);
    const ip=req.ip||'unknown';
    const key=ip;
    const previous=attempts.get(key);
    if(previous&&previous.until>Date.now()&&previous.count>=15) throw new HttpError(429,'Too many login attempts. Try again in 15 minutes.');
    if(attempts.size>10000) for(const [k,v] of attempts) if(v.until<Date.now()) attempts.delete(k);
    attempts.set(key,{count:previous&&previous.until>Date.now()?previous.count+1:1,until:previous&&previous.until>Date.now()?previous.until:Date.now()+900000});
    const row=db.prepare('SELECT * FROM users WHERE email=?').get(input.email) as (User&{password_hash:string})|undefined;
    if(!row||!checkPassword(input.password,row.password_hash)) throw new HttpError(401,'Email or password is incorrect.');
    attempts.delete(key);
    const session=randomBytes(32).toString('hex');
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(session),row.id,Date.now()+86400000);
    res.cookie('bookleaf_session',session,{...cookieOptions,maxAge:86400000});
    res.json({user:{id:row.id,name:row.name,email:row.email,role:row.role}});
  });
  app.use('/api',(req,_res,next)=>{
    const session=token(req);
    const user=session?db.prepare('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(session),Date.now()):undefined;
    if(!user) return next(new HttpError(401,'Please log in to continue.'));
    req.user=user as User;next();
  });
  const admin=(req:Request,_res:Response,next:NextFunction)=>req.user.role==='admin'?next():next(new HttpError(403,'Administrator access is required.'));
  function ticketFor(req:Request) {
    const ticket=db.prepare('SELECT * FROM tickets WHERE id=?').get(String(req.params.id)) as Ticket|undefined;
    if(!ticket||(req.user.role!=='admin'&&ticket.author_id!==req.user.id)) throw new HttpError(404,'Ticket not found.');
    return ticket;
  }
  app.get('/api/auth/me',(req,res)=>res.json({user:req.user,aiConfigured:!!process.env.ANTHROPIC_API_KEY}));
  app.post('/api/auth/logout',(req,res)=>{const session=token(req);if(session)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(session));res.clearCookie('bookleaf_session',cookieOptions).json({ok:true});});
  app.get('/api/books',(req,res)=>{
    const rows=req.user.role==='admin'?db.prepare('SELECT details FROM books').all():db.prepare('SELECT details FROM books WHERE author_id=?').all(req.user.id);
    res.json({books:rows.map(row=>JSON.parse(row.details as string))});
  });
  app.get('/api/tickets',(req,res)=>{
    const filters=z.object({status:z.enum(statuses).optional(),category:z.enum(categories).optional(),priority:z.enum(priorities).optional(),from:z.iso.date().optional(),to:z.iso.date().optional()}).parse(req.query);
    if(filters.from&&filters.to&&filters.from>filters.to) throw new HttpError(400,'Start date must be before end date.');
    const conditions:string[]=[];const args:string[]=[];
    if(req.user.role==='author'){conditions.push('t.author_id=?');args.push(req.user.id);}
    for(const field of ['status','category','priority'] as const) if(filters[field]){conditions.push(`t.${field}=?`);args.push(filters[field]);}
    if(filters.from){conditions.push('substr(t.created_at,1,10)>=?');args.push(filters.from);}
    if(filters.to){conditions.push('substr(t.created_at,1,10)<=?');args.push(filters.to);}
    const columns=req.user.role==='admin'?'t.*':'t.id,t.author_id,t.book_id,t.subject,t.description,t.category,t.priority,t.status,t.assigned_to,t.created_at,t.updated_at';
    res.json({tickets:db.prepare(`SELECT ${columns},u.name AS author_name,json_extract(b.details,'$.title') AS book_title FROM tickets t JOIN users u ON u.id=t.author_id LEFT JOIN books b ON b.id=t.book_id ${conditions.length?'WHERE '+conditions.join(' AND '):''} ORDER BY CASE t.status WHEN 'Open' THEN 0 WHEN 'In Progress' THEN 0 ELSE 1 END, CASE t.priority WHEN 'Critical' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,t.created_at ASC`).all(...args)});
  });
  app.post('/api/tickets',async(req,res)=>{
    if(req.user.role!=='author') throw new HttpError(403,'Only authors can submit tickets.');
    const input=z.object({book_id:z.string().max(30).nullable().optional(),subject:text(150),description:text(5000)}).parse(req.body);
    if(input.book_id&&!db.prepare('SELECT id FROM books WHERE id=? AND author_id=?').get(input.book_id,req.user.id)) throw new HttpError(400,'Please choose one of your books.');
    // Persist before any external API call: outages cannot lose the author's query.
    const id=randomUUID();const now=new Date().toISOString();
    db.prepare('INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,req.user.id,input.book_id||null,input.subject,input.description,'General Inquiry','Medium','Open',null,now,now,'Pending','');
    const result=await classify(input.subject,input.description);
    db.prepare("UPDATE tickets SET category=?,priority=?,ai_source=?,updated_at=? WHERE id=? AND ai_source='Pending'").run(result.category,result.priority,result.source,new Date().toISOString(),id);
    res.status(201).json({id});
  });
  app.get('/api/tickets/:id',(req,res)=>{
    const ticket=ticketFor(req);
    const messages=db.prepare(`SELECT m.id,m.body,m.internal,m.created_at,u.name AS sender,u.role FROM messages m JOIN users u ON u.id=m.user_id WHERE m.ticket_id=? ${req.user.role==='author'?'AND m.internal=0':''} ORDER BY m.created_at,m.rowid`).all(ticket.id);
    const book=ticket.book_id?db.prepare('SELECT details FROM books WHERE id=?').get(ticket.book_id):null;
    const author=db.prepare('SELECT name FROM users WHERE id=?').get(ticket.author_id);
    const {ai_draft:_,ai_source:__,...publicTicket}=ticket;
    res.json({ticket:req.user.role==='admin'?ticket:publicTicket,messages,book:book?JSON.parse(book.details as string):null,authorName:author?.name});
  });
  app.patch('/api/tickets/:id',admin,(req,res)=>{
    const ticket=ticketFor(req);
    const input=z.object({status:z.enum(statuses).optional(),category:z.enum(categories).optional(),priority:z.enum(priorities).optional(),assigned_to:z.enum(['me','unassigned']).optional()}).strict().parse(req.body);
    if(Object.keys(input).length===0)throw new HttpError(400,'Provide a ticket field to update.');
    db.prepare('UPDATE tickets SET status=?,category=?,priority=?,assigned_to=?,ai_draft=?,updated_at=? WHERE id=?').run(input.status||ticket.status,input.category||ticket.category,input.priority||ticket.priority,input.assigned_to==='me'?req.user.id:input.assigned_to==='unassigned'?null:ticket.assigned_to,input.category&&input.category!==ticket.category?'':ticket.ai_draft,new Date().toISOString(),ticket.id);
    res.json({ok:true});
  });
  app.post('/api/tickets/:id/messages',admin,(req,res)=>{
    const ticket=ticketFor(req);
    const input=z.object({body:text(6000),internal:z.boolean().default(false)}).parse(req.body);
    const now=new Date().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare('INSERT INTO messages VALUES(?,?,?,?,?,?)').run(randomUUID(),ticket.id,req.user.id,input.body,input.internal?1:0,now);
      db.prepare('UPDATE tickets SET updated_at=? WHERE id=?').run(now,ticket.id);
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    res.status(201).json({ok:true});
  });
  const draftJobs=new Map<string,Promise<{text:string;source:string}>>();
  app.post('/api/tickets/:id/draft',admin,async(req,res)=>{
    const ticket=ticketFor(req);
    if(ticket.ai_draft) return res.json({text:ticket.ai_draft,source:ticket.ai_source.includes('Draft AI')?'AI':'Policy template — review before sending'});
    let job=draftJobs.get(ticket.id);
    if(!job){
      const author=db.prepare('SELECT name FROM users WHERE id=?').get(ticket.author_id)!;
      const book=ticket.book_id?db.prepare('SELECT details FROM books WHERE id=?').get(ticket.book_id):null;
      job=draft(ticket,author.name as string,book?JSON.parse(book.details as string) as Book:undefined);
      draftJobs.set(ticket.id,job);
    }
    try {
      const result=await job;
      // Avoid caching stale category context if another admin changed it during generation.
      db.prepare('UPDATE tickets SET ai_draft=?,ai_source=? WHERE id=? AND category=?').run(result.text,ticket.ai_source+'; Draft '+result.source,ticket.id,ticket.category);
      res.json(result);
    }finally{draftJobs.delete(ticket.id);}
  });
  app.use('/api',(_req,_res,next)=>next(new HttpError(404,'API endpoint not found.')));
  app.use((error:unknown,_req:Request,res:Response,_next:NextFunction)=>{
    if(error instanceof ZodError) return res.status(400).json({error:'Please check the supplied fields.',details:error.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
    if(error instanceof HttpError) return res.status(error.status).json({error:error.message});
    if(error instanceof SyntaxError) return res.status(400).json({error:'Invalid JSON request.'});
    if((error as {type?:string})?.type==='entity.too.large') return res.status(413).json({error:'Request is too large.'});
    console.error('Unhandled request error',error instanceof Error?error.message:'Unknown error');
    res.status(500).json({error:'Something went wrong. Please try again.'});
  });
  return app;
}
