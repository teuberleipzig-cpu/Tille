import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHandler } from '../src/app.js';
import { BoardProvider } from '../src/board/board-provider.js';
import { TrelloProvider, BoardConfigurationError } from '../src/board/trello-provider.js';
import { formatDigest, runDigest } from '../src/digest/weekly-digest.js';
import { MemoryRateLimit } from '../src/rate-limit/rate-limit.js';

class FakeBoard extends BoardProvider { constructor() { super(); this.items = []; this.counts = { total: 0, categories: {} }; } async createFeedback(value) { this.items.push(value); } async countNewFeedbackSince() { return this.counts; } }
class FakeCaptcha { constructor(valid = true) { this.valid = valid; } async verify() { return this.valid; } }
const config = enabled => ({ captcha: { provider: 'recaptcha', enabled, siteKey: 'public-site-key' } });
async function fixture({ captcha = false, validCaptcha = true, board = new FakeBoard(), max = 50 } = {}) {
  const server = http.createServer(createHandler({ config: config(captcha), boardProvider: board, captchaProvider: new FakeCaptcha(validCaptcha), rateLimit: new MemoryRateLimit({ max, windowMs: 60000 }), logger: { error() {} } }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { board, close: () => new Promise(resolve => server.close(resolve)), request: (path, options) => fetch(base + path, options) };
}
const valid = { category: 'Awareness', feedback: 'A useful message', replyEmail: 'reply@example.invalid', captchaToken: 'test-token', honeypot: '', ignored: 'not forwarded' };
const post = body => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('healthz = 200', async t => { const f = await fixture(); t.after(f.close); assert.equal((await f.request('/healthz')).status, 200); });
test('config exposes public values and no secret', async t => { const f = await fixture({ captcha: true }); t.after(f.close); const body = await (await f.request('/api/feedback/config')).json(); assert.deepEqual(body, { captcha: { provider: 'recaptcha', enabled: true, siteKey: 'public-site-key' } }); assert.equal(JSON.stringify(body).includes('secret'), false); });
test('valid feedback succeeds once', async t => { const f = await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback', post(valid))).status, 201); assert.equal(f.board.items.length, 1); });
for (const [name, patch] of [['empty category',{category:''}],['unknown category',{category:'Unknown'}],['empty feedback',{feedback:''}],['long feedback',{feedback:'x'.repeat(10001)}],['invalid email',{replyEmail:'bad'}]]) test(`${name} = 400`, async t => { const f=await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback',post({...valid,...patch}))).status,400); });
test('honeypot is neutral and never writes', async t => { const f=await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback',post({...valid,honeypot:'bot'}))).status,201); assert.equal(f.board.items.length,0); });
test('missing captcha = 400', async t => { const f=await fixture({captcha:true}); t.after(f.close); assert.equal((await f.request('/api/feedback',post({...valid,captchaToken:''}))).status,400); });
test('invalid captcha = 400', async t => { const f=await fixture({captcha:true,validCaptcha:false}); t.after(f.close); assert.equal((await f.request('/api/feedback',post(valid))).status,400); });
test('valid captcha writes', async t => { const f=await fixture({captcha:true}); t.after(f.close); await f.request('/api/feedback',post(valid)); assert.equal(f.board.items.length,1); });
test('board error is controlled 503 without stack', async t => { const board={async createFeedback(){throw new Error('internal-sensitive-detail')}}; const f=await fixture({board}); t.after(f.close); const r=await f.request('/api/feedback',post(valid)); const text=await r.text(); assert.equal(r.status,503); assert.equal(text.includes('internal-sensitive-detail'),false); assert.equal(text.includes(' at '),false); });
test('rate limit = 429', async t => { const f=await fixture({max:1}); t.after(f.close); await f.request('/api/feedback',post(valid)); assert.equal((await f.request('/api/feedback',post(valid))).status,429); });
test('large body = 413', async t => { const f=await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback',post({...valid,feedback:'x'.repeat(33000)}))).status,413); });
test('GET submit endpoint = 405', async t => { const f=await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback')).status,405); });
test('wrong content type = 415', async t => { const f=await fixture(); t.after(f.close); assert.equal((await f.request('/api/feedback',{method:'POST',body:'x'})).status,415); });
test('payload excludes captcha, IP and unknown fields', async t => { const f=await fixture(); t.after(f.close); await f.request('/api/feedback',post(valid)); const item=f.board.items[0]; assert.deepEqual(Object.keys(item).sort(),['category','feedback','receivedAt','replyEmail','requestId']); assert.equal(JSON.stringify(item).includes('test-token'),false); assert.equal(JSON.stringify(item).includes('127.0.0.1'),false); assert.equal(JSON.stringify(item).includes('ignored'),false); });

const trelloConfig = () => ({ apiKey:'key', token:'token', categoryDestinations:{Einlass:'list-e',Bar:'list-b',Club:'list-c',Awareness:'list-a',Sonstiges:'list-s'},openLabelId:'open',replyRequestedLabelId:'reply' });
for (const [category,id] of Object.entries(trelloConfig().categoryDestinations)) test(`${category} maps to category destination`, async () => { let body; const p=new TrelloProvider(trelloConfig(),async(_u,o)=>{body=o.body;return{ok:true}}); await p.createFeedback({category,feedback:'text',replyEmail:'',receivedAt:'2026-08-12T09:15:00Z'}); assert.equal(body.get('idList'),id); });
test('every card gets open label', async () => { let body; const p=new TrelloProvider(trelloConfig(),async(_u,o)=>{body=o.body;return{ok:true}}); await p.createFeedback({category:'Bar',feedback:'text',replyEmail:'',receivedAt:new Date().toISOString()}); assert.equal(body.get('idLabels'),'open'); });
test('reply email adds reply label', async () => { let body; const p=new TrelloProvider(trelloConfig(),async(_u,o)=>{body=o.body;return{ok:true}}); await p.createFeedback({category:'Bar',feedback:'text',replyEmail:'a@example.invalid',receivedAt:new Date().toISOString()}); assert.equal(body.get('idLabels'),'open,reply'); });
test('missing destination is controlled configuration error', async () => { const c=trelloConfig(); c.categoryDestinations.Bar=''; await assert.rejects(()=>new TrelloProvider(c).createFeedback({category:'Bar',feedback:'x',replyEmail:'',receivedAt:new Date().toISOString()}),BoardConfigurationError); });
test('missing open label is controlled configuration error', async () => { const c=trelloConfig(); c.openLabelId=''; await assert.rejects(()=>new TrelloProvider(c).createFeedback({category:'Bar',feedback:'x',replyEmail:'',receivedAt:new Date().toISOString()}),BoardConfigurationError); });
test('card description has no Gmail subject', async () => { let body; const p=new TrelloProvider(trelloConfig(),async(_u,o)=>{body=o.body;return{ok:true}}); await p.createFeedback({category:'Club',feedback:'hello',replyEmail:'',receivedAt:new Date().toISOString()}); assert.equal(body.get('desc').includes('Gmail'),false); assert.match(body.get('name'),/^Website Feedback · Club ·/); });
test('fake provider is interchangeable', async () => { const fake=new FakeBoard(); await fake.createFeedback({category:'Bar'}); assert.equal(fake.items.length,1); });
test('digest skips zero', async () => { const board=new FakeBoard(); const result=await runDigest({boardProvider:board,mailProvider:{send(){throw new Error()}},since:'x',recipient:'x'}); assert.equal(result.sent,false); });
test('digest aggregates categories without personal content', async () => { const board=new FakeBoard(); board.counts={total:3,categories:{Einlass:1,Awareness:2}}; let mail; await runDigest({boardProvider:board,mailProvider:{async send(v){mail=v}},since:'x',recipient:'team@example.invalid'}); assert.match(mail.text,/Einlass: 1/); assert.match(mail.text,/Awareness: 2/); assert.equal(mail.text.includes('reply@example.invalid'),false); assert.equal(mail.text.includes('A useful message'),false); });
test('digest formatter is provider neutral', () => { assert.equal(formatDigest({total:1,categories:{Bar:1}}).includes('Trello'),false); });
test('frontend removed FormSubmit, private target and external next', async () => { const html=await readFile(new URL('../../feedback.html',import.meta.url),'utf8'); assert.equal(/formsubmit|teuber1995|_next|github\.io/i.test(html),false); });
test('frontend redirects locally and prevents duplicate submit', async () => { const js=await readFile(new URL('../../assets/feedback.js',import.meta.url),'utf8'); assert.match(js,/feedback-thanks\.html/); assert.match(js,/button\.disabled/); assert.match(js,/Feedback could not be sent/); });
