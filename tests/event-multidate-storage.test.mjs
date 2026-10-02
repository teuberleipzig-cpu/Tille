import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildEventStorage, eventDates, eventMonthKeys, reconstructEventDocument } from '../public/site/js/event-storage-model.js';
import { createPublicEventStore } from '../public/site/js/event-store.js';
import { storageArtifacts } from '../public/site/js/event-storage-model.js';
import { parseFileMakerEventJson, applyFileMakerOperation } from '../scripts/filemaker/filemaker-event-model.mjs';
import { eventSeoArtifacts, eventOutputPath, eventJsonLd } from '../scripts/events/event-seo.mjs';

const ID = 'fm-11111111-2222-3333-4444-555555555555';
const parse = (input, op = 'upsert') => parseFileMakerEventJson(JSON.stringify({ id: ID, ...input }), op);
const event = (dates = ['2026-10-31', '2026-11-01']) => ({
  id: ID, date: dates[0], dates, title: 'Fixture Festival', sections: [], future: { nested: [null, '', { keep: true }] }
});
const document = e => ({ unknown: { keep: true }, events: [e] });
const apply = (e, input, op = 'upsert') => applyFileMakerOperation(document(e), op, parse(input, op)).document;

test('legacy date-only stays date-only; date projection does not mutate', () => {
  const e = { id: ID, date: '2026-10-16', title: 'Legacy' }, before = structuredClone(e);
  assert.deepEqual(eventDates(e), ['2026-10-16']);
  assert.deepEqual(reconstructEventDocument(buildEventStorage(document(e))), document(e));
  assert.deepEqual(e, before); assert.equal(Object.hasOwn(e, 'dates'), false);
});

test('productive parser trims, sorts, dedupes and checks consecutive days; dates-only create derives date', () => {
  const parsed = parse({ title: 'New', dates: ['2026-10-17', ' 2026-10-16 ', '2026-10-17'] });
  assert.deepEqual(parsed.dates, ['2026-10-16', '2026-10-17']);
  const created = applyFileMakerOperation({ events: [] }, 'upsert', parsed).document.events[0];
  assert.equal(created.date, '2026-10-16'); assert.deepEqual(eventDates(created), parsed.dates);
  assert.equal(created.id, ID);
});

test('productive dates limits and explicit contradictory primary fail closed', () => {
  for (const dates of [[], null, '2026-10-16', [null], ['2026-02-29'], ['0000-01-01'], Array(32).fill('2026-10-16')]) {
    assert.throws(() => parse({ dates }));
  }
  assert.equal(parse({ dates: Array.from({ length: 31 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`) }).dates.length, 31);
  assert.throws(() => parse({ date: '2026-10-17', dates: ['2026-10-16'] }), /ersten/);
});

test('same-month placement is unique and does not invent intermediate days', () => {
  const e = event(['2026-10-16', '2026-10-17']), s = buildEventStorage(document(e));
  assert.deepEqual(eventDates(e), ['2026-10-16', '2026-10-17']);
  assert.deepEqual(eventMonthKeys(e), ['2026-10']);
  assert.equal(s.months.get('2026-10').events.length, 1);
  assert.equal(s.manifest.totalEvents, 1); assert.equal(s.manifest.totalMonthPlacements, 1);
});

test('cross-month placements retain one canonical global index and primary month', () => {
  const s = buildEventStorage(document(event()));
  assert.deepEqual([...s.months.keys()], ['2026-10', '2026-11']);
  for (const m of s.months.values()) assert.equal(m.events.length, 1);
  assert.equal(s.manifest.schemaVersion, 1);
  assert.equal(s.manifest.totalEvents, 1); assert.equal(s.manifest.totalMonthPlacements, 2);
  assert.deepEqual(s.eventIndex.events, [{ id: ID, month: '2026-10', order: 0 }]);
  assert.equal(s.searchIndex.events.length, 1); assert.equal(s.searchIndex.events[0].month, '2026-10');
});

for (const dates of [[], null, ['2026-10-31', '2026-10-31'], ['2026-11-01', '2026-10-31'],
  [' 2026-10-31'], ['2026-02-30'], ['0000-01-01'], Array(32).fill('2026-10-31')]) {
  test(`persisted dates fail closed without repair: ${JSON.stringify(dates).slice(0, 70)}`, () => {
    assert.throws(() => buildEventStorage(document({ ...event(), dates })));
  });
}
test('stored primary mismatch fails; projection returns a copy', () => {
  assert.throws(() => eventDates({ ...event(), date: '2026-11-01' }), /ersten/);
  const e = event(); eventDates(e).push('2026-12-01'); assert.equal(e.dates.length, 2);
  assert.deepEqual(eventDates(event(['0099-01-01'])), ['0099-01-01']);
});

test('reconstruction retains full objects, unknown fields and global nonchronological order', () => {
  const doc = { meta: { unknown: 1 }, events: [event(['2027-01-01']), { ...event(), id: 'other' }] };
  const s = structuredClone(buildEventStorage(doc));
  // JSON member order is not content; retain the first full copy without rebuilding fields.
  s.months.get('2026-11').events[0] = Object.fromEntries(Object.entries(doc.events[1]).reverse());
  assert.deepEqual(reconstructEventDocument(s), doc);
  delete s.manifest.totalMonthPlacements;
  assert.deepEqual(reconstructEventDocument(s), doc);
});
test('conflicting unknown fields across independent month copies fail', () => {
  const s = buildEventStorage(document(event()));
  s.months.set('2026-11', structuredClone(s.months.get('2026-11')));
  s.months.get('2026-11').events[0].future.nested[2].keep = false;
  assert.throws(() => reconstructEventDocument(s), /Widersprüchliche/);
});
for (const [name, mutate] of [
  ['duplicate index ID', s => s.eventIndex.events.push({ ...s.eventIndex.events[0], order: 1 })],
  ['missing index ID', s => { s.eventIndex.events = []; }],
  ['wrong unique total', s => { s.manifest.totalEvents = 2; }],
  ['duplicate order', s => { s.eventIndex.events[0].order = 1; }],
  ['wrong primary month', s => { s.eventIndex.events[0].month = '2026-11'; }],
  ['duplicate within month', s => s.months.get('2026-10').events.push(event())],
  ['missing month copy', s => s.months.delete('2026-11')]
]) test(`reconstruction rejects ${name}`, () => {
  const s = buildEventStorage(document(event())); mutate(s);
  assert.throws(() => reconstructEventDocument(s));
});

test('updates preserve omitted dates and unknown fields, including matching date-only update', () => {
  const original = event();
  for (const input of [{ title: 'Changed' }, { date: original.date }]) {
    const saved = apply(original, input).events[0];
    assert.deepEqual(saved.dates, original.dates); assert.deepEqual(saved.future, original.future);
  }
  assert.throws(() => apply(original, { date: '2026-11-01' }), /vollständige dates-Liste/);
});
test('explicit replacement removes old placements and supports return to one day', () => {
  const replaced = apply(event(), { dates: ['2027-02-28', '2027-03-01'] });
  assert.deepEqual([...buildEventStorage(replaced).months.keys()], ['2027-02', '2027-03']);
  const single = apply(replaced.events[0], { dates: ['2027-04-01'] });
  assert.deepEqual(single.events[0].dates, ['2027-04-01']);
  assert.equal(buildEventStorage(single).manifest.totalMonthPlacements, 1);
});
test('remove remains ID-only, supplied dates are not applied', () => {
  assert.deepEqual(parse({ dates: 'ignored on remove' }, 'remove'), { id: ID });
  const s = buildEventStorage(apply(event(), { dates: [] }, 'remove'));
  assert.equal(s.months.size, 0); assert.equal(s.manifest.totalEvents, 0);
  assert.equal(s.manifest.totalMonthPlacements, 0);
  assert.deepEqual(s.eventIndex.events, []); assert.deepEqual(s.searchIndex.events, []);
});
test('tags and timetable remain blocked for upsert and remove', () => {
  for (const op of ['upsert', 'remove']) for (const extra of [{ tags: [] }, { timetable: null }]) {
    assert.throws(() => parse({ dates: ['2026-10-16'], ...extra }, op), /Nicht unterstütztes/);
  }
});

test('public month loading, canonical resolution and search return no duplicate results', async t => {
  const e = event(), { files } = storageArtifacts(document(e));
  t.mock.method(globalThis, 'fetch', async file => {
    assert.ok(files.has(file), file);
    return { ok: true, json: async () => JSON.parse(files.get(file)) };
  });
  const store = createPublicEventStore();
  for (const month of ['2026-10', '2026-11']) assert.deepEqual(await store.loadMonth(month), [e]);
  assert.deepEqual(await store.resolveEvent(ID), e);
  assert.deepEqual(await store.search('Fixture'), [e]);
});
test('SEO retains one page and sitemap URL, using the primary date only', () => {
  const e = event(), sitemap = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>https://www.distillery.de/</loc></url>\n</urlset>';
  const output = eventSeoArtifacts(reconstructEventDocument(buildEventStorage(document(e))), sitemap);
  assert.deepEqual([...output.files.keys()].sort(), [eventOutputPath(ID), 'sitemap.xml'].sort());
  assert.equal(output.files.get('sitemap.xml').split(`/events/${ID}/`).length - 1, 1);
  assert.equal(eventJsonLd(e).startDate, e.date);
});

test('active browser storage import chains are cache-busted including shared SEO', async () => {
  const read = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
  for (const file of ['public/site/js/event-store.js', 'public/admin/js/core/event-storage-admin.js',
    'public/admin/js/core/event-image-only-save.js', 'scripts/events/event-seo.mjs']) {
    assert.match(await read(file), /event-storage-model\.js\?v=event-storage-model-3/);
  }
  for (const file of ['index.html', 'event.html']) assert.match(await read(file), /event-store\.js\?v=event-store-3/);
  assert.match(await read('public/admin/js/core/event-image-only-save.js'), /event-seo\.mjs\?v=event-seo-categories-1/);
  const loader = await read('public/admin/js/auto-github-load.js');
  assert.match(loader, /event-storage-admin\.js\?v=event-storage-admin-3/);
  assert.match(loader, /event-image-only-save\.js\?v=event-image-only-save-3/);
});
