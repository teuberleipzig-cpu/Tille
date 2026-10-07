import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeTags } from '../scripts/filemaker/contracts-v2/tags.mjs';
import { parseFileMakerEventJson, applyFileMakerOperation } from '../scripts/filemaker/filemaker-event-model.mjs';
import { tagKey, eventTags, monthTags, matchesEventTags, retainAvailableTagKeys, renderEventTags } from '../public/site/js/event-tags.js';
import { renderTagFilters } from '../public/site/js/event-tag-filters.js';
import { storageArtifacts, reconstructEventDocument, eventSearchHaystack } from '../public/site/js/event-storage-model.js';
import { createPublicEventStore } from '../public/site/js/event-store.js';
import { visibleMonthEvents, filterMonthEvents, calendarEvents } from '../public/site/js/event-presentation.js';
import { renderEventHtml, eventSeoArtifacts } from '../scripts/events/event-seo.mjs';
import { tagFixture } from './helpers/event-tags-fixture.mjs';

const id = 'fm-11111111-1111-4111-8111-111111111111';
const parse = fields => parseFileMakerEventJson(JSON.stringify({ id, ...fields }));
const existing = { id, date:'2026-10-16', title:'Fixture', tags:['Konzert'], future:{keep:true}, sections:[] };
const apply = fields => applyFileMakerOperation({ events:[existing] }, 'upsert', parse(fields)).document.events[0];
const month = visibleMonthEvents(tagFixture.events, '2026-10');

test('tag normalization, NFC, case key and first spelling without input mutation', () => {
  const input = [' Konzert ', 'konzert', 'Mu\u0308nchen', 'MÜNCHEN', 'PoetrySlam', 'Poetry Slam'];
  const before = [...input];
  assert.deepEqual(normalizeTags(input), ['Konzert', 'München', 'PoetrySlam', 'Poetry Slam']);
  assert.deepEqual(input, before); assert.equal(tagKey(' Konzert '), 'konzert');
});
test('20 inputs before dedupe and 60 Unicode code points are boundaries', () => {
  assert.equal(normalizeTags(Array(20).fill('Tag')).length, 1);
  assert.throws(() => normalizeTags(Array(21).fill('Tag')));
  assert.equal([...normalizeTags(['🎵'.repeat(60)])[0]].length, 60);
  assert.throws(() => normalizeTags(['🎵'.repeat(61)]));
});
for (const value of [null, 'House', [1], [''], [' '], [' House'], ['House '], ['Mu\u0308nchen'],
  ['House','HOUSE'], ['<b>x</b>'], ['javascript:x'], ['data:x'], ['blob:x'], ['x\u200b'], ['x\n'],
  ['x'.repeat(61)], Array(21).fill('Tag'), ['ghp_'+'a'.repeat(30)]]) {
  test(`persisted tags fail closed ${JSON.stringify(value).slice(0,45)}`, () => assert.throws(() => eventTags({tags:value}), /Event-tags/));
}
test('missing tags and empty tags are valid, no mutation or alias', () => {
  assert.deepEqual(eventTags({}), []); assert.deepEqual(eventTags({tags:[]}), []);
  const e={tags:['House']}; eventTags(e).push('Other'); assert.deepEqual(e.tags,['House']);
});
test('productive parser accepts tags, absent stays absent, explicit clear stays explicit', () => {
  assert.deepEqual(parse({tags:[' House ','HOUSE']}).tags,['House']);
  assert.equal(Object.hasOwn(parse({}), 'tags'),false); assert.deepEqual(parse({tags:[]}).tags,[]);
});
test('environment and payload budget remain blocked', () => {
  assert.throws(()=>parse({environment:'staging'}),/Nicht unterstütztes/);
  assert.throws(()=>parse({tags:['x'.repeat(40961)]}),/40 KB/);
});
test('apply missing tags preserves existing tags and unknown fields', () => {
  assert.deepEqual(apply({title:'New'}).tags,['Konzert']); assert.deepEqual(apply({}).future,{keep:true});
});
test('apply replacement preserves established same-event display spelling and payload order', () => {
  assert.deepEqual(apply({tags:['Open Air','konzert']}).tags,['Open Air','Konzert']);
  assert.deepEqual(existing.tags,['Konzert']);
});
test('apply clear and new event semantics', () => {
  assert.deepEqual(apply({tags:[]}).tags,[]);
  const create=fields=>applyFileMakerOperation({events:[]},'upsert',parse({date:'2026-10-16',title:'New',...fields})).document.events[0];
  assert.equal(Object.hasOwn(create({}),'tags'),false); assert.deepEqual(create({tags:[' house ']}).tags,['house']);
});
test('storage roundtrip preserves tags, unknown fields and unique multi-month search identity', async t => {
  const {storage,files}=storageArtifacts(tagFixture);
  assert.deepEqual(reconstructEventDocument(storage),tagFixture);
  assert.ok(eventSearchHaystack(tagFixture.events[0]).includes('house'));
  t.mock.method(globalThis,'fetch',async p=>({ok:files.has(p),json:async()=>JSON.parse(files.get(p))}));
  const store=createPublicEventStore();
  assert.deepEqual((await store.search('festival')).map(e=>e.id),['festival']);
  assert.equal((await store.search('HOUSE')).length,3);
});
test('public loading rejects malformed persisted tags', async t => {
  const {files}=storageArtifacts(tagFixture); const bad=JSON.parse(files.get('public/events/data/months/2026-10.json'));
  bad.events[0].tags=[' House']; files.set('public/events/data/months/2026-10.json',JSON.stringify(bad));
  t.mock.method(globalThis,'fetch',async p=>({ok:true,json:async()=>JSON.parse(files.get(p))}));
  await assert.rejects(createPublicEventStore().loadMonth('2026-10'),/Event-tags/);
});
test('month filters use first sorted display, exclude archive, retain first-occurrence order', () => {
  assert.deepEqual(monthTags(month).map(t=>t.label),['HOUSE','LIVE','TECHNO','Langer Tag '.repeat(5).trim(),'FESTIVAL']);
  assert.equal(monthTags(tagFixture.events).some(t=>t.key==='hidden'),false);
});
for(const [category,tags,expected] of [
  [null,[],5],['friday',[],2],[null,['house'],2],[null,['house','techno'],3],['friday',['house','techno'],2],['saturday',['techno'],0]
]) test(`category AND tags OR: ${category} ${tags}`,()=>assert.equal(filterMonthEvents(month,category,new Set(tags)).length,expected));
test('month change prunes only unavailable keys and calendar follows filtered set',()=>{
  const next=monthTags(visibleMonthEvents(tagFixture.events,'2026-11'));
  assert.deepEqual([...retainAvailableTagKeys(new Set(['house','techno','festival']),next)],['house','festival']);
  assert.deepEqual([...calendarEvents(filterMonthEvents(month,'friday',new Set(['house'])),'2026-10').keys()],[16]);
  assert.equal(matchesEventTags({},new Set()),true);
});
test('public and SEO tags are escaped below title, preserve spelling, absent has no container',()=>{
  const event={...existing,tags:['R&B','"Live"',"DJ's"]}; const html=renderEventHtml(event);
  assert.match(renderEventTags(event),/R&amp;B/); assert.match(html,/&quot;Live&quot;/); assert.match(html,/DJ&#39;s/);
  assert.ok(html.indexOf('class="event-tags"')>html.indexOf('</h1>'));
  assert.equal(renderEventTags({}), ''); assert.doesNotMatch(renderEventHtml({...existing,tags:[]}),/class="event-tags"|event-tags.css/);
  const sitemap='<urlset><url><loc>https://www.distillery.de/</loc></url></urlset>';
  assert.equal(eventSeoArtifacts({events:[event]},sitemap).files.get('sitemap.xml'),eventSeoArtifacts({events:[existing]},sitemap).files.get('sitemap.xml'));
});
test('tag DOM owner reuses buttons and updates aria-pressed without touching inputs',()=>{
  const root={children:[],hidden:false,querySelectorAll(){return [...this.children]},insertBefore(b,ref){this.children=this.children.filter(x=>x!==b);this.children.splice(ref?this.children.indexOf(ref):this.children.length,0,b)},ownerDocument:{createElement(){return {dataset:{},classList:{toggle(){}},setAttribute(k,v){this[k]=v},remove(){root.children=root.children.filter(b=>b!==this)}}}}};
  const tags=monthTags(month); renderTagFilters(root,tags,new Set(['house']));const first=root.children[0];
  assert.equal(first.type,'button');assert.equal(first['aria-pressed'],'true');
  renderTagFilters(root,tags,new Set(['live'])); assert.equal(root.children[0],first);assert.equal(first['aria-pressed'],'false');
  renderTagFilters(root,[],new Set());assert.equal(root.hidden,true);assert.equal(root.children.length,0);
});
test('integration keeps independent owners, clears combined filters on search and versions active chains',()=>{
  const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'); const html=read('index.html');
  assert.match(html,/id="tag-filters" aria-label="Event-Tags" hidden/);
  assert.match(html,/activeCategory=null;activeTagKeys.clear\(\)/);
  assert.match(html,/searchQuery='';i.value='';const key=b.dataset.tagKey/);
  assert.match(html,/Number\(!!activeCategory\)\+activeTagKeys.size/);
  const dom=read('public/site/js/event-tag-filters.js');
  assert.doesNotMatch(dom,/innerHTML|outerHTML|setInterval|MutationObserver|category-filters|event-search|calendar/);
  for(const p of ['index.html','event.html']) {
    assert.match(read(p),/renderEventTags\(e\)/); assert.match(read(p),/event-tags.css\?v=event-tags-1/);
    assert.match(read(p),/event-presentation.js\?v=event-presentation-3/);
  }
});
