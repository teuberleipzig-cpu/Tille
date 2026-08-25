import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createAtomicGitHubCommit } from '../public/admin/js/core/github-atomic-commit.js';
import { buildMonthlyEventFiles, loadMonthlyEventDocument, saveMonthlyEventDocument } from '../public/admin/js/core/event-storage-admin.js';
import { buildEventStorage, effectiveEventId, eventMonthKey, eventSearchHaystack, reconstructEventDocument, searchEventIndex, storageArtifacts } from '../public/site/js/event-storage-model.js';

const root = new URL('../', import.meta.url);
const readGenerated = path => readFile(new URL(path, root), 'utf8').then(JSON.parse);
const original = await loadMonthlyEventDocument(readGenerated);
const canonicalDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const nonFileMakerEvents = value => value.events.filter(event => !String(event.id || '').startsWith('fm-'));
const built = buildEventStorage(original);
const reconstructed = reconstructEventDocument(built);

test('generated non-FileMaker production history matches the pre-FileMaker canonical digest', () => {
  assert.equal(canonicalDigest(nonFileMakerEvents(original)), '1c9ef5b4731c2d9309bba7d2f1739d139a17fc224160df821e5a4c79e017e974');
});
test('legacy digest covers the complete ordered non-FileMaker event data only', () => {
  assert.deepEqual(nonFileMakerEvents(original), original.events.filter(event => !String(event.id || '').startsWith('fm-')));
  const changedMeta = structuredClone(original);
  changedMeta.meta = { changed: true };
  assert.equal(canonicalDigest(nonFileMakerEvents(changedMeta)), canonicalDigest(nonFileMakerEvents(original)));
});
test('additional controlled FileMaker events do not change the protected legacy digest', () => {
  const withAdditionalFileMakerEvent = structuredClone(original);
  withAdditionalFileMakerEvent.events.push({ id: 'fm-test-controlled-event', date: '2026-08-22', title: 'Test', sections: [] });
  assert.equal(canonicalDigest(nonFileMakerEvents(withAdditionalFileMakerEvent)), canonicalDigest(nonFileMakerEvents(original)));
});
test('non-FileMaker event changes alter the protected legacy digest', () => {
  const changed = structuredClone(original);
  changed.events.find(event => !String(event.id || '').startsWith('fm-')).title += ' changed';
  assert.notEqual(canonicalDigest(nonFileMakerEvents(changed)), canonicalDigest(nonFileMakerEvents(original)));
});

test('manifest parses and declares monthly storage schema', async () => {
  const manifest = await readGenerated('public/events/data/manifest.json');
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.totalEvents, original.events.length); assert.equal(manifest.months.length, 182);
});
test('month keys accept real ISO dates', () => assert.equal(eventMonthKey('2026-08-15'), '2026-08'));
test('month keys reject invalid values', () => { for (const value of ['', '2026-02-30', '2026-13-01', 'not-a-date']) assert.equal(eventMonthKey(value), ''); });
test('migration preserves event count', () => assert.equal(reconstructed.events.length, original.events.length));
test('migration is deeply equal', () => assert.deepEqual(reconstructed, original));
test('unknown event fields survive', () => { const input={meta:{},events:[{id:'x',date:'2026-01-01',future:{nested:[null,'']}}]};assert.deepEqual(reconstructEventDocument(buildEventStorage(input)),input); });
test('top-level metadata survives', () => assert.deepEqual(reconstructed.meta, original.meta));
test('meta artists survive', () => assert.deepEqual(reconstructed.meta.artists, original.meta.artists));
test('explicit event ids survive', () => assert.deepEqual(reconstructed.events.map(e=>e.id), original.events.map(e=>e.id)));
test('fallback event id matches legacy slug behavior', () => assert.equal(effectiveEventId({date:'2026-01-02',title:'Ä Test!'}), '2026-01-02-a-test'));
test('effective id collisions are rejected', () => assert.throws(()=>buildEventStorage({events:[{id:'same',date:'2026-01-01'},{id:'same',date:'2026-02-01'}]}),/Kollision/));
test('month order preserves source-relative order', () => { for(const month of built.manifest.months){const old=original.events.filter(e=>e.date.startsWith(month.key));assert.deepEqual(built.months.get(month.key).events,old);} });
test('global reconstruction preserves nonchronological order', () => assert.deepEqual(reconstructed.events.map(e=>e.id), original.events.map(e=>e.id)));
test('current month selection is equivalent', () => assert.deepEqual(built.months.get('2026-08').events, original.events.filter(e=>e.date.startsWith('2026-08'))));
test('previous month selection is equivalent', () => assert.deepEqual(built.months.get('2026-07').events, original.events.filter(e=>e.date.startsWith('2026-07'))));
test('next month selection is equivalent', () => assert.deepEqual(built.months.get('2026-09').events, original.events.filter(e=>e.date.startsWith('2026-09'))));
test('empty months stay empty without generated files', () => assert.equal(built.months.has('2024-01'), false));
test('every direct event id resolves to the same event', () => {const map=new Map([...built.months.values()].flatMap(m=>m.events.map(e=>[effectiveEventId(e),e])));for(const e of original.events)assert.deepEqual(map.get(effectiveEventId(e)),e);});
test('search haystacks are identical for every event', () => assert.deepEqual(reconstructed.events.map(eventSearchHaystack),original.events.map(eventSearchHaystack)));
test('search results match legacy semantics', () => {const entries=built.searchIndex.events;for(const q of ['techno','live','CSV Test','ä','example.com']){const old=original.events.filter(e=>eventSearchHaystack(e).includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de'))).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.title).localeCompare(String(b.title),'de')).map(effectiveEventId);assert.deepEqual(searchEventIndex(entries,q).map(e=>e.id),old);}});
test('search sort remains date-descending then title', () => {const out=searchEventIndex(built.searchIndex.events,'event');assert.deepEqual(out,[...out].sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.title).localeCompare(String(b.title),'de')));});
test('category filter data is unchanged', () => assert.deepEqual(reconstructed.events.map(e=>e.color),original.events.map(e=>e.color)));
test('admin full load reconstructs original document', async () => {const files=new Map([...storageArtifacts(original).files].map(([p,t])=>[p,JSON.parse(t)]));assert.deepEqual(await loadMonthlyEventDocument(async p=>files.get(p)),original);});
test('admin same-month edit changes only that month and derived files', () => {const clone=structuredClone(original),e=clone.events.find(x=>x.date.startsWith('2026-08'));e.title+=' edited';const next=buildMonthlyEventFiles(clone);assert.notEqual(next.files.get('public/events/data/months/2026-08.json'),storageArtifacts(original).files.get('public/events/data/months/2026-08.json'));});
test('admin cross-month move removes source and adds destination once', () => {const clone=structuredClone(original),e=clone.events.find(x=>x.date.startsWith('2026-08')),id=e.id;e.date='2026-09-05';const s=buildEventStorage(clone);assert.equal(s.months.get('2026-08')?.events.some(x=>x.id===id)===true,false);assert.equal(s.months.get('2026-09').events.filter(x=>x.id===id).length,1);assert.equal(reconstructEventDocument(s).events.length,original.events.length);});
test('admin create updates count and target month', () => {const clone=structuredClone(original);clone.events.push({id:'created',date:'2026-08-20',title:'Created',sections:[]});const s=buildEventStorage(clone);assert.equal(s.manifest.totalEvents,original.events.length+1);assert.equal(s.months.get('2026-08').events.at(-1).id,'created');});
test('admin duplicate preserves current explicit-id collision protection', () => {const clone=structuredClone(original);clone.events.push(structuredClone(clone.events[0]));assert.throws(()=>buildEventStorage(clone),/Kollision/);});
test('admin delete updates count and index', () => {const clone=structuredClone(original),removed=clone.events.pop();const s=buildEventStorage(clone);assert.equal(s.manifest.totalEvents,original.events.length-1);assert.equal(s.eventIndex.events.some(e=>e.id===removed.id),false);});
test('meta artist save updates meta artifact', () => {const clone=structuredClone(original);clone.meta.artists.push({name:'Test'});const s=buildMonthlyEventFiles(clone);assert.equal(JSON.parse(s.files.get('public/events/data/meta.json')).meta.artists.at(-1).name,'Test');});
test('manifest and indices update together', () => {const files=buildMonthlyEventFiles(original).files;for(const p of ['public/events/data/manifest.json','public/events/data/event-index.json','public/events/data/search-index.json'])assert.equal(files.has(p),true);});
test('storage artifacts are deterministic', () => assert.deepEqual([...storageArtifacts(original).files],[...storageArtifacts(original).files]));
test('manifest generation failure publishes nothing', async () => {let called=false;await assert.rejects(()=>saveMonthlyEventDocument({document:{events:[{id:'bad',date:'invalid'}]},writer:{commitFiles:async()=>{called=true}},expectedHead:'h'}),/g.lti/);assert.equal(called,false);});
test('month-file serialization failure publishes nothing', async () => {let called=false;const event={id:'bad',date:'2026-01-01'};event.circular=event;await assert.rejects(()=>saveMonthlyEventDocument({document:{events:[event]},writer:{commitFiles:async()=>{called=true}},expectedHead:'h'}),/circular/i);assert.equal(called,false);});

function response(ok,status,payload){return{ok,status,json:async()=>payload};}
function atomicMock(failAt='',initialHead='head-old'){
  const calls=[];let patches=0,refReads=0;
  const mock=async(url,options={})=>{const method=options.method||'GET',path=new URL(url).pathname,c={method,path,body:options.body&&JSON.parse(options.body)};calls.push(c);const stage=method==='PATCH'?'ref':method==='POST'&&path.endsWith('/git/blobs')?'blob':method==='POST'&&path.endsWith('/git/trees')?'tree':method==='POST'&&path.endsWith('/git/commits')?'commit':'';if(failAt&&stage===failAt)return response(false,500,{message:`${stage} failed`});if(path.includes('/git/ref/heads/')){refReads++;return response(true,200,{object:{sha:initialHead==='concurrent'&&refReads>1?'head-other':initialHead}});}if(method==='GET'&&path.includes('/git/commits/'))return response(true,200,{tree:{sha:'tree-old'}});if(method==='GET'&&path.includes('/git/trees/'))return response(true,200,{tree:[]});if(stage==='blob')return response(true,201,{sha:'blob-new'});if(stage==='tree')return response(true,201,{sha:'tree-new'});if(stage==='commit')return response(true,201,{sha:'commit-new'});if(method==='PATCH'){patches++;return response(true,200,{object:{sha:'commit-new'}});}throw new Error(`Unexpected ${method} ${path}`)};
  return{mock,calls,get patches(){return patches}};
}

test('branch conflict blocks before blob creation', async()=>{const m=atomicMock('', 'head-new'),w=createAtomicGitHubCommit({owner:'o',repo:'r',branch:'test/x',token:'t',fetch:m.mock});await assert.rejects(()=>w.commitFiles({files:new Map([['x','y']]),expectedHead:'head-old'}),/Konflikt/);assert.equal(m.calls.some(c=>c.path.endsWith('/git/blobs')),false);});
test('atomic save creates one commit and one ref update', async()=>{const m=atomicMock(),w=createAtomicGitHubCommit({owner:'o',repo:'r',branch:'test/x',token:'t',fetch:m.mock});const out=await w.commitFiles({files:new Map([['x','y']]),expectedHead:'head-old',message:'m'});assert.equal(out.commit,'commit-new');assert.equal(m.calls.filter(c=>c.path.endsWith('/git/commits')&&c.method==='POST').length,1);assert.equal(m.patches,1);});
for(const stage of ['blob','tree','commit','ref'])test(`failure at ${stage} never publishes a partial event state`,async()=>{const m=atomicMock(stage),w=createAtomicGitHubCommit({owner:'o',repo:'r',branch:'test/x',token:'t',fetch:m.mock});await assert.rejects(()=>w.commitFiles({files:new Map([['x','y']]),expectedHead:'head-old',message:'m'}));assert.equal(m.patches,0);});
test('concurrent update before ref patch prevents stale overwrite',async()=>{const m=atomicMock('', 'concurrent'),w=createAtomicGitHubCommit({owner:'o',repo:'r',branch:'test/x',token:'t',fetch:m.mock});await assert.rejects(()=>w.commitFiles({files:new Map([['x','y']]),expectedHead:'concurrent',message:'m'}),/während/);assert.equal(m.patches,0);});
