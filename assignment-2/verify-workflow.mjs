// Offline contract checks against the actual exported n8n Code nodes.
// No credentials, provider requests, webhook publication or database writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const workflow = JSON.parse(readFileSync(new URL('./n8n-royalty-summary.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const authors = JSON.parse(readFileSync(new URL('../bookleaf_sample_data (1).json', import.meta.url), 'utf8')).authors;
const node = name => {
  const found = workflow.nodes.find(item => item.name === name);
  assert.ok(found, `Missing node: ${name}`);
  return found;
};
const config = Object.fromEntries(node('Workflow Config').parameters.assignments.assignments.map(field => [field.name, field.value]));
function run(name, context, current = {}) {
  const result = new Script(`(function(){${node(name).parameters.jsCode}\n})()`).runInNewContext({
    $: key => ({first: () => ({json: context[key]})}),
    $json: current
  }, {timeout: 1000});
  return JSON.parse(JSON.stringify(result));
}
function validate(author) {
  const context = {
    'Workflow Config': config,
    'Incoming Royalty Request': {body: {request_id: `test-${author.author_id}`, notification_id: 'fixture-notification', author}}
  };
  return {data: run('Validate & Compute Totals', context)[0].json, context};
}

assert.equal(workflow.active, false, 'Draft must remain unpublished');
assert.ok(workflow.nodes.every(item => !item.credentials || Object.keys(item.credentials).length === 0), 'No credential or Gateway reference should be attached before user configuration');
assert.equal(Object.keys(workflow.pinData || {}).length, 0, 'Do not ship pinned synthetic AI output');
assert.equal(node('Incoming Royalty Request').parameters.authentication, 'headerAuth');
assert.equal(config.anthropic_model, 'claude-haiku-4-5');
assert.ok(config.bubble_callback_url.includes('.invalid'), 'Do not ship a guessed callback URL');
let bulkCount = 0;
for (const author of authors) {
  const {data, context} = validate(author);
  assert.equal(data.valid, true, `${author.author_id}: ${JSON.stringify(data.errors)}`);
  assert.equal(data.ack_status_code, 202);
  const sum = field => author.books.reduce((total, book) => total + book[field], 0);
  assert.equal(data.totals.total_royalty_earned, sum('total_royalty_earned'));
  assert.equal(data.totals.total_royalty_paid, sum('royalty_paid'));
  assert.equal(data.totals.total_royalty_pending, sum('royalty_pending'));
  if (sum('royalty_pending') > 0) bulkCount++;
  const records = [...data.published_books, ...data.production_books];
  for (const book of author.books) {
    assert.equal(records.find(record => record.book_id === book.book_id)?.status, book.status, 'Keep original publication/production stage');
  }
  context['Validate & Compute Totals'] = data;
  const prompt = run('Build AI Prompt', context, data).json.anthropic_request;
  assert.match(prompt.system, /untrusted/i);
  assert.equal(prompt.model, config.anthropic_model);
  assert.equal(prompt.max_tokens, 1200);
  for (const book of author.books.filter(book => book.status.includes('Production'))) {
    assert.ok(prompt.messages[0].content.includes(book.status), 'Prompt must include exact production stage');
  }
}
assert.equal(bulkCount, 9);

const badBalance = structuredClone(authors[0]);
badBalance.books[0].royalty_pending++;
assert.equal(validate(badBalance).data.valid, false);
const duplicate = structuredClone(authors[0]);
duplicate.books.push(duplicate.books[0]);
assert.equal(validate(duplicate).data.valid, false);
const invalidNumber = structuredClone(authors[0]);
invalidNumber.books[0].total_copies_sold = 'NaN';
assert.equal(validate(invalidNumber).data.valid, false);
const productionOnly = structuredClone(authors[6]);
productionOnly.books = productionOnly.books.filter(book => book.status.includes('Production'));
const productionResult = validate(productionOnly).data;
assert.equal(productionResult.valid, true);
assert.equal(productionResult.totals.fully_paid, false, 'No earned royalties is not the same as prior royalties paid');

const {data, context} = validate(authors[0]);
context['Validate & Compute Totals'] = data;
const checkOutput = current => run('Check AI Output & Build Payload', context, current).json;
assert.equal(checkOutput({error: {message: '429 rate limit'}}).status, 'Failed');
assert.equal(checkOutput({content: [{type: 'text', text: 'not json'}]}).status, 'Failed');
assert.equal(checkOutput({stop_reason: 'max_tokens', content: []}).status, 'Failed');
const body = `Hi Priya, here is your BookLeaf royalty summary. Total earned ${data.totals.total_royalty_earned_display}; total paid ${data.totals.total_royalty_paid_display}; total pending ${data.totals.total_royalty_pending_display}. Royalties are calculated quarterly and paid within 45 days of quarter end. Please contact BookLeaf if you need a detailed breakdown.`;
const success = checkOutput({stop_reason: 'end_turn', content: [{type: 'text', text: JSON.stringify({subject: 'Your BookLeaf royalty summary', body})}]});
assert.equal(success.status, 'Success');
assert.equal(success.request_id, data.request_id);
assert.equal(success.notification_id, data.notification_id);
console.log('PASS: all 10 authors / 18 books accepted; exact balances and stages retained; 9 bulk candidates; invalid input and AI failures rejected; draft remains unpublished.');
