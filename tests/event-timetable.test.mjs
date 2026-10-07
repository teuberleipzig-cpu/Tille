import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFileMakerEventJson, applyFileMakerOperation } from '../scripts/filemaker/filemaker-event-model.mjs';
import { eventTimetable, timetableDays, renderEventTimetable } from '../public/site/js/event-timetable.js';
import { storageArtifacts, reconstructEventDocument, eventMonthKeys, eventSearchHaystack } from '../public/site/js/event-storage-model.js';
import { createPublicEventStore } from '../public/site/js/event-store.js';
import { renderEventHtml, eventSeoArtifacts } from '../scripts/events/event-seo.mjs';
import { saveEventImageOnly } from '../public/admin/js/core/event-image-only-save.js';
import { slot, timetable, timetableFixture } from './helpers/event-timetable-fixture.mjs';

const id='fm-11111111-1111-4111-8111-111111111111';
const parse=(fields,op='upsert')=>parseFileMakerEventJson(JSON.stringify({id,...fields}),op);
const base=()=>({...structuredClone(timetableFixture.events[0]),id,tags:['House'],dates:['2026-10-16'],future:{keep:true},timetable:timetable(slot())});
const apply=fields=>applyFileMakerOperation({events:[base()]},'upsert',parse(fields)).document.events[0];
test('productive input object, null and omitted; input floor contract remains strict',()=>{
  assert.deepEqual(parse({timetable:{slots:[slot()]}}).timetable,timetable(slot()));
  assert.equal(parse({timetable:null}).timetable,null);
  assert.equal(Object.hasOwn(parse({}),'timetable'),false);
  assert.throws(()=>parse({timetable:{slots:[slot(undefined,undefined,{floor:''})]}}));
  assert.throws(()=>parse({environment:'staging'}),/Nicht unterstütztes/);
  assert.throws(()=>parse({timetable:{slots:[slot(undefined,undefined,{floor:'x'.repeat(41000)})]}}),/40 KB/);
});
test('apply preserves omitted, replaces object, clear deletes; unrelated fields intact',()=>{
  assert.deepEqual(apply({title:'Changed'}).timetable,base().timetable);
  const updated=apply({timetable:{slots:[slot(undefined,undefined,{floor:'Other'})]}});
  assert.equal(updated.timetable.slots[0].floor,'Other');
  for(const key of ['tags','dates','imageUrl','sections','future'])assert.deepEqual(updated[key],base()[key]);
  assert.equal(Object.hasOwn(apply({timetable:null}),'timetable'),false);
  for(const fields of [{},{timetable:null}])assert.equal(Object.hasOwn(applyFileMakerOperation({events:[]},'upsert',parse({date:'2026-10-16',title:'New',...fields})).document.events[0],'timetable'),false);
  assert.deepEqual(parse({timetable:{broken:true}},'remove'),{id});
});
const malformed=[
  e=>{e.timetable=null}, e=>{e.timetable.extra=1},e=>{e.timetable.slots=[]},
  e=>{e.timetable.slots[0].start='2026-10-16T22:00:00Z'},
  e=>{e.timetable.slots[0].end=e.timetable.slots[0].start},
  e=>{delete e.timetable.slots[0].floor},e=>{e.timetable.slots[0].floor=' Main'},
  e=>{e.timetable.slots[0].artists[0].name=' Name'},
  e=>{delete e.timetable.slots[0].artists[0].info},
  e=>{e.timetable.slots[0].artists[0].link='javascript:bad'},
  e=>{e.timetable.slots[0].artists[0].unknown=1},
  e=>{e.timetable.slots.unshift({...e.timetable.slots[0],start:'2026-10-17T22:00:00+02:00',end:'2026-10-17T23:00:00+02:00'})}
];
for(const [i,mutate] of malformed.entries())test(`persisted invalid ${i} fails closed without repair`,()=>{
  const e=base();mutate(e);const before=structuredClone(e);assert.throws(()=>eventTimetable(e));assert.deepEqual(e,before);
  assert.throws(()=>storageArtifacts({events:[e]}));
});
test('persisted accepts canonical defaults; storage preserves; dates not derived',()=>{
  const e=base();const before=structuredClone(e);assert.deepEqual(eventTimetable(e),e.timetable);assert.deepEqual(e,before);
  assert.equal(eventTimetable({}),null);
  const {storage}=storageArtifacts(structuredClone(timetableFixture));assert.deepEqual(reconstructEventDocument(storage),timetableFixture);
  assert.deepEqual(eventMonthKeys(timetableFixture.events.at(-1)),['2026-10','2026-11']);
  assert.deepEqual(eventMonthKeys(timetableFixture.events[1]),['2026-10']);
  storage.months.get('2026-10').events[0].timetable={slots:[]};assert.throws(()=>reconstructEventDocument(storage));
});
test('search includes floor and all artist fields, no duplicated multi-month identity',async t=>{
  const {files}=storageArtifacts(timetableFixture);
  t.mock.method(globalThis,'fetch',async p=>({ok:files.has(p),json:async()=>JSON.parse(files.get(p))}));
  const store=createPublicEventStore();assert.equal((await store.search('Timetable Artist')).filter(e=>e.id==='multi-month-timetable').length,1);
  for(const query of ['Floor 2','Live','example.com/artist'])assert.ok((await store.search(query)).length);
  assert.ok(eventSearchHaystack(base()).includes('fixture artist'));
  const bad=JSON.parse(files.get('public/events/data/months/2026-10.json'));bad.events[0].timetable=null;files.set('public/events/data/months/2026-10.json',JSON.stringify(bad));
  await assert.rejects(createPublicEventStore().loadMonth('2026-10'),/Timetable/);
});
test('local start day, stable simultaneous floors, mixed unnamed groups and cross-midnight',()=>{
  const days=timetableDays(timetableFixture.events[2].timetable);
  assert.deepEqual(days.map(d=>d.day),['2026-10-16','2026-10-17']);
  assert.deepEqual(days[0].floors.map(f=>f.floor),['Main','Floor 2']);
  assert.deepEqual(timetableDays(timetableFixture.events[5].timetable)[0].floors.map(f=>f.floor),['','Main']);
  const html=renderEventTimetable(timetableFixture.events[1]);
  assert.match(html,/FREITAG · 16.10.2026/);assert.match(html,/23:30–01:00/);assert.doesNotMatch(html,/SAMSTAG|\+02:00/);
  assert.doesNotMatch(renderEventTimetable(timetableFixture.events[3]),/<h3>|MAIN|OTHER|UNKNOWN/);
});
test('details replace sections only, tags/description stay, safe linked multiple artists',()=>{
  const e=base();e.timetable=timetable(slot(undefined,undefined,{artists:[{name:'R&B',info:'"Live"',link:'https://example.com/?a=1&b=2'},{name:'Second'}]}));
  const html=renderEventHtml(e);
  assert.match(html,/R&amp;B/);assert.match(html,/&quot;Live&quot;/);assert.match(html,/Second/);
  assert.match(html,/target="_blank" rel="noopener noreferrer"/);assert.match(html,/a=1&amp;b=2/);
  assert.match(html,/class="event-tags"/);assert.match(html,/Preserved description/);
  assert.doesNotMatch(html,/Fixture Artist/);
  assert.match(renderEventHtml(apply({timetable:null})),/Fixture Artist/);
  assert.equal(renderEventTimetable({}),'');
  const sitemap='<urlset><url><loc>https://www.distillery.de/</loc></url></urlset>';
  assert.equal(eventSeoArtifacts({events:[e]},sitemap).files.get('sitemap.xml'),eventSeoArtifacts({events:[{...e,timetable:undefined}].map(({timetable,...rest})=>rest)},sitemap).files.get('sitemap.xml'));
});
test('fresh Admin image save preserves timetable and only owns image',async()=>{
  const e=base(),document={events:[e]},before=structuredClone(document);let committed;
  const saved=await saveEventImageOnly({targetEventId:id,requestedImageUrl:'public/events/media/new.jpg',loadFresh:async()=>({document,head:'fresh'}),writer:{commitFiles:async input=>{committed=input;return {changed:true}}}});
  assert.deepEqual(saved.event.timetable,e.timetable);assert.deepEqual(document,before);assert.equal(committed.expectedHead,'fresh');
  assert.match(committed.files.get(`events/${id}/index.html`),/class="event-timetable"/);
});
test('overview retains sections; all details share renderer and active cache chain',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');const html=read('index.html');
  const list=html.split('function renderEvent(e)')[1].split('function renderEvents')[0];assert.doesNotMatch(list,/renderEventTimetable/);assert.match(list,/sections/);
  for(const file of ['index.html','event.html'])assert.match(read(file),/renderEventTimetable\(e\)\|\|sections/);
  assert.match(read('scripts/events/event-seo.mjs'),/timetableHtml \|\| renderSections/);
  for (const file of ['event-timetable.js','event-timetable-contract.js','event-contract-text.js']) {
    assert.doesNotMatch(read('public/site/js/'+file), /from\s+['"][^'"]*\.mjs/);
  }
  for(const file of ['index.html','event.html','scripts/events/event-seo.mjs','public/site/js/event-storage-model.js','public/site/js/event-store.js'])assert.match(read(file),/event-timetable.js\?v=event-timetable-1/);
});
