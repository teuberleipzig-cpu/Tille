import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { berlinTimestamp, normalizeTimetable, MAX_TIMETABLE_SLOTS } from '../scripts/filemaker/contracts-v2/timetable.mjs';
import { normalizeEventV2Patch } from '../scripts/filemaker/contracts-v2/event-contract.mjs';

const fixture = JSON.parse(await readFile(new URL('./fixtures/event-contract-v2.json', import.meta.url)));
const slot = () => structuredClone(fixture.event.timetable.slots[0]);
for (const value of ['2026-01-15T22:00:00+01:00', '2026-07-15T22:00:00+02:00', '2026-10-25T02:30:00+02:00', '2026-10-25T02:30:00+01:00']) {
  test(`Berlin valid ${value}`, () => assert.equal(berlinTimestamp(value), Date.parse(value)));
}
for (const value of ['2026-01-15T22:00:00+02:00', '2026-07-15T22:00:00+01:00', '2026-03-29T02:30:00+01:00', '2026-03-29T02:30:00+02:00', '2026-01-15T22:00:00', '2026-01-15T22:00:00Z', '2026-02-30T22:00:00+01:00', '2026-01-15T24:00:00+01:00', '2026-01-15T22:60:00+01:00', '2026-01-15T22:00:60+01:00', '2026-01-15T22:00:00+99:00']) {
  test(`Berlin invalid ${value}`, () => assert.throws(() => berlinTimestamp(value)));
}
test('fall-back repeated hour compares instants, not wall-clock strings', () => {
  const value = slot();
  value.start = '2026-10-25T02:45:00+02:00'; value.end = '2026-10-25T02:15:00+01:00';
  assert.doesNotThrow(() => normalizeTimetable({ slots: [value] }));
});
test('missing timetable preserves, null clears, object replaces', () => {
  assert.equal(Object.hasOwn(normalizeEventV2Patch({}), 'timetable'), false);
  assert.deepEqual(normalizeEventV2Patch({ timetable: null }), { timetable: null });
  assert.deepEqual(normalizeTimetable({ slots: [slot()] }), { slots: [slot()] });
});
for (const value of [{}, { slots: [] }, { slots: 'x' }, [], { slots: Array(41).fill(slot()) }]) {
  test(`invalid timetable structure ${JSON.stringify(value).slice(0, 40)}`, () => assert.throws(() => normalizeTimetable(value)));
}
test('slot limit 40 is accepted; full payload budget remains separate', () => {
  assert.equal(MAX_TIMETABLE_SLOTS, 40);
  assert.equal(normalizeTimetable({ slots: Array(40).fill(slot()) }).slots.length, 40);
});
test('missing floors are valid and normalize deterministically', () => {
  const first = slot(), second = slot();
  delete first.floor; delete second.floor;
  second.start = '2026-10-17T01:00:00+02:00'; second.end = '2026-10-17T03:00:00+02:00';
  assert.deepEqual(normalizeTimetable({ slots: [first, second] }).slots.map(value => value.floor), ['', '']);
});
test('an explicitly provided normal floor remains unchanged', () => {
  assert.equal(normalizeTimetable({ slots: [slot()] }).slots[0].floor, 'Main');
});
for (const changes of [{ start: undefined }, { end: undefined }, { end: '2026-10-16T21:00:00+02:00' }, { end: '2026-10-16T22:00:00+02:00' }, { floor: '' }, { floor: '   ' }, { floor: '<b>Main</b>' }, { floor: 'x'.repeat(301) }, { artists: [] }, { artists: Array(11).fill({ name: 'Fixture' }) }, { artists: [{}] }, { unexpected: true }]) {
  test(`invalid slot ${JSON.stringify(changes).slice(0, 65)}`, () => assert.throws(() => normalizeTimetable({ slots: [{ ...slot(), ...changes }] })));
}
for (const link of ['javascript:x', 'data:text/plain,x', 'blob:x', 'ftp://example.com', '/artist', 'https://user:pass@example.com']) {
  test(`unsafe artist URL ${link}`, () => {
    const value = slot(); value.artists[0].link = link;
    assert.throws(() => normalizeTimetable({ slots: [value] }));
  });
}
test('optional artist fields normalize and text guards apply', () => {
  const value = slot(); value.artists = [{ name: ' A\u0308nne 東京 ' }];
  assert.deepEqual(normalizeTimetable({ slots: [value] }).slots[0].artists, [{ name: 'Änne 東京', info: '', link: '' }]);
  for (const info of ['x\u0000y', 'ghp_' + 'a'.repeat(30), 'x'.repeat(1001)]) {
    value.artists[0].info = info;
    assert.throws(() => normalizeTimetable({ slots: [value] }));
  }
});
test('overlaps on same/different floors allowed; midnight does not manufacture dates', () => {
  const value = { slots: [slot(), { ...slot(), floor: 'Second' }, slot()] };
  const normalized = normalizeEventV2Patch({ timetable: value });
  assert.equal(normalized.timetable.slots.length, 3);
  assert.equal(Object.hasOwn(normalized, 'dates'), false);
});
test('slots sorted chronologically, simultaneous input order retained, input unchanged', () => {
  const early = slot(), late = { ...slot(), start: '2026-10-17T01:00:00+02:00', end: '2026-10-17T03:00:00+02:00' };
  const value = { slots: [late, early, { ...early, floor: 'Second' }] }, copy = structuredClone(value);
  assert.deepEqual(normalizeTimetable(value).slots.map(s => s.floor), ['Main', 'Second', 'Main']);
  assert.deepEqual(value, copy);
});
