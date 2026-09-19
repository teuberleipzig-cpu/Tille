import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateEnvironment, normalizeEventV2Patch, assertPayloadBudget } from '../scripts/filemaker/contracts-v2/event-contract.mjs';
import { normalizeDates } from '../scripts/filemaker/contracts-v2/dates.mjs';
import { normalizeTags, tagKey } from '../scripts/filemaker/contracts-v2/tags.mjs';
import { parseFileMakerEventJson, applyFileMakerOperation } from '../scripts/filemaker/filemaker-event-model.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/event-contract-v2.json', import.meta.url)));
const patch = () => { const { date, dates, tags, timetable } = fixture.event; return structuredClone({ date, dates, tags, timetable }); };

for (const value of ['staging', 'live']) test(`environment accepts ${value}`, () => assert.equal(validateEnvironment(value), value));
for (const value of [undefined, null, '', 'LIVE', 'Staging', ' staging', 'live ', 'main', 1]) {
  test(`environment rejects ${JSON.stringify(value)}`, () => assert.throws(() => validateEnvironment(value), /environment/));
}
test('empty patch preserves absent fields rather than manufacturing clears', () => assert.deepEqual(normalizeEventV2Patch({}), {}));
test('date-only old/new event contract remains valid', () => {
  const input = { id: fixture.event.id, date: '2026-10-16', title: 'Fixture' };
  const parsed = parseFileMakerEventJson(JSON.stringify(input));
  const created = applyFileMakerOperation({ events: [] }, 'upsert', parsed).document;
  assert.equal(created.events[0].date, input.date);
  assert.deepEqual(normalizeEventV2Patch({ date: input.date }), { date: input.date });
});
test('dates trim deduplicate sort and preserve gaps; derive primary date', () => {
  assert.deepEqual(normalizeEventV2Patch({ dates: ['2026-10-18', ' 2026-10-16 ', '2026-10-18'] }), {
    date: '2026-10-16', dates: ['2026-10-16', '2026-10-18']
  });
});
test('explicit primary date conflict fails', () => assert.throws(() => normalizeEventV2Patch({ date: '2026-10-17', dates: ['2026-10-16'] }), /ersten/));
test('single date represents return to one day', () => assert.deepEqual(normalizeEventV2Patch({ dates: ['2026-10-16'] }).dates, ['2026-10-16']));
for (const value of [[], null, '2026-10-16', ['2026-02-29'], ['2026-02-30'], ['0000-01-01'], [2], Array(32).fill('2026-10-16')]) {
  test(`invalid date list ${JSON.stringify(value).slice(0, 60)}`, () => assert.throws(() => normalizeDates(value)));
}
test('31 dates and real leap day accepted', () => {
  assert.equal(normalizeDates(Array.from({ length: 31 }, (_, i) => `2028-01-${String(i + 1).padStart(2, '0')}`)).length, 31);
  assert.deepEqual(normalizeDates(['2028-02-29']), ['2028-02-29']);
});
test('tags replace and explicit empty array clears', () => {
  assert.deepEqual(normalizeEventV2Patch({ tags: [] }), { tags: [] });
  assert.deepEqual(normalizeTags([' Konzert ', 'konzert', 'Konzert']), ['Konzert']);
});
test('tag Unicode NFC, first spelling and distinct words preserved', () => {
  assert.deepEqual(normalizeTags(['Mu\u0308nchen', 'MÜNCHEN', '東京', 'PoetrySlam', 'Poetry Slam', 'Day-Rave']), ['München', '東京', 'PoetrySlam', 'Poetry Slam', 'Day-Rave']);
  assert.equal(tagKey('Konzert'), tagKey(' konzert '));
});
for (const value of [null, 'Clubnacht', [null], [' '], ['x'.repeat(61)], Array(21).fill('Tag'), ['<b>x</b>'], ['x\nY'], ['x\u0085Y'], ['x\u200bY'], ['javascript:x']]) {
  test(`invalid tags ${JSON.stringify(value).slice(0, 50)}`, () => assert.throws(() => normalizeTags(value)));
}
test('tag boundaries 20 entries and 60 Unicode code points', () => {
  assert.equal(normalizeTags(Array.from({ length: 20 }, (_, i) => `Tag ${i}`)).length, 20);
  assert.equal(normalizeTags(['界'.repeat(60)])[0].length, 60);
});
test('possible secrets rejected without echoing supplied value', () => {
  for (const secret of ['ghp_' + 'a'.repeat(30), 'github_pat_' + 'b'.repeat(25), 'AKIA' + 'A'.repeat(16)]) {
    assert.throws(() => normalizeTags([secret]), error => /Secret/.test(error.message) && !error.message.includes(secret));
  }
});
test('deterministic normalized patch does not mutate input', () => {
  const input = patch(), before = structuredClone(input);
  assert.deepEqual(normalizeEventV2Patch(input), normalizeEventV2Patch(input));
  const result = normalizeEventV2Patch(input);
  result.timetable.slots[0].artists[0].name = 'Changed';
  assert.deepEqual(input, before);
});
test('40 KB raw UTF-8 budget applies independently to full future payload', () => {
  assert.doesNotThrow(() => assertPayloadBudget('x'.repeat(40960)));
  assert.throws(() => assertPayloadBudget('界'.repeat(14000)), /40 KB/);
  assert.throws(() => assertPayloadBudget({}), /JSON-Text/);
  assert.throws(() => normalizeEventV2Patch({ tags: ['x'.repeat(40961)] }), /40 KB/);
});
test('environment cannot be part of the event field patch', () => assert.throws(() => normalizeEventV2Patch({ environment: 'live' }), /unbekanntes Feld/));
for (const [key, value] of Object.entries({ dates: ['2026-10-16'], tags: [], timetable: null, environment: 'staging' })) {
  test(`production V1 still rejects ${key} for upsert and remove`, () => {
    for (const op of ['upsert', 'remove']) assert.throws(() => parseFileMakerEventJson(JSON.stringify({ id: fixture.event.id, [key]: value }), op), /Nicht unterstütztes Event-Feld/);
  });
}
