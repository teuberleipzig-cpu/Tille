import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { normalizeDates } from '../scripts/filemaker/contracts-v2/dates.mjs';
import { eventDates, storageArtifacts } from '../public/site/js/event-storage-model.js';
import { createPublicEventStore } from '../public/site/js/event-store.js';
import { EVENT_CATEGORIES, eventCategory, eventDateLabel, visibleMonthEvents, monthCategories, calendarEvents } from '../public/site/js/event-presentation.js';
import { renderEventHtml, eventMetaDescription, eventSeoArtifacts } from '../scripts/events/event-seo.mjs';
import { categoryFixture, fixtureEvent } from './helpers/event-categories-fixture.mjs';

const events = categoryFixture.events;
const cross = events.find(e => e.id === 'cross-month');

test('input normalizes first, then rejects gaps without filling or mutating', () => {
  const days = [' 2026-10-31 ', '2026-11-02', '2026-10-31'];
  const before = structuredClone(days);
  assert.throws(() => normalizeDates(days), /aufeinanderfolgenden/);
  assert.deepEqual(days, before);
  assert.deepEqual(normalizeDates(['2026-11-02', '2026-10-31', '2026-11-01', '2026-11-01']), cross.dates);
});

test('persisted gap is invalid for storage, public category/range, and generated HTML', () => {
  const bad = fixtureEvent('gap', ['2026-10-31', '2026-11-02']);
  for (const fn of [eventDates, eventCategory, eventDateLabel, renderEventHtml]) {
    assert.throws(() => fn(bad), /aufeinanderfolgenden/);
  }
  assert.throws(() => storageArtifacts({ events: [bad] }), /aufeinanderfolgenden/);
});

for (const dates of [
  ['2026-12-31', '2027-01-01'], ['2028-02-28', '2028-02-29', '2028-03-01'],
  ['2026-03-28', '2026-03-29', '2026-03-30'], ['2026-10-24', '2026-10-25', '2026-10-26']
]) {
  test(`UTC consecutive days across calendar boundary ${dates[0]}`, () => {
    assert.deepEqual(normalizeDates(dates), dates);
    assert.deepEqual(eventDates(fixtureEvent('boundary', dates)), dates);
  });
}

test('host timezone does not affect DST continuity, weekday or range', () => {
  const source = `import {normalizeDates} from './scripts/filemaker/contracts-v2/dates.mjs';
    import {eventCategory,eventDateLabel} from './public/site/js/event-presentation.js';
    const dates=normalizeDates(['2026-03-28','2026-03-29','2026-03-30']);
    const e={date:dates[0],dates}; console.log(JSON.stringify([dates,eventCategory(e),eventDateLabel(e)]));`;
  const results = ['UTC', 'Europe/Berlin', 'America/Los_Angeles'].map(TZ =>
    execFileSync(process.execPath, ['--input-type=module', '-e', source], { env: { ...process.env, TZ }, encoding: 'utf8' }));
  assert.equal(new Set(results).size, 1);
});

test('all weekday labels and exact colors ignore historical color and preserve objects', () => {
  const colors = ['#9EB99B', '#ADA0C6', '#CC99AF', '#88B9B3', '#7B9EC8', '#E49A78', '#C8B48C', '#E8CB7A'];
  assert.deepEqual(EVENT_CATEGORIES.map(c => c.color), colors);
  assert.deepEqual(EVENT_CATEGORIES.map(c => c.label), ['MONTAG', 'DIENSTAG', 'MITTWOCH', 'DONNERSTAG', 'FREITAG', 'SAMSTAG', 'SONNTAG', 'ÜBERLÄNGE']);
  const before = structuredClone(events);
  events.slice(0, 7).forEach((event, i) => assert.equal(eventCategory(event), EVENT_CATEGORIES[i]));
  assert.equal(eventCategory(cross), EVENT_CATEGORIES[7]);
  assert.equal(eventCategory({ ...events[4], dates: [events[4].date], color: 'yellow' }).key, 'friday');
  assert.deepEqual(events, before);
});

for (const [id, label] of [['friday', '16.10.2026'], ['same-month', '16.–18.10.2026'],
  ['cross-month', '31.10.–02.11.2026'], ['cross-year', '31.12.2026–02.01.2027']]) {
  test(`browser and static detail share full range and category: ${id}`, () => {
    const e = events.find(e => e.id === id), category = eventCategory(e), html = renderEventHtml(e);
    assert.equal(eventDateLabel(e), label);
    assert.ok(html.includes(`<span class="event-date">${label}</span>`));
    assert.ok(html.includes(`data-category="${category.key}" style="--event-color:${category.color}"`));
    assert.ok(eventMetaDescription(e).includes(label));
    assert.ok(html.includes(`https://www.distillery.de/events/${id}/`));
  });
}

test('month membership, stable ties, full range and unique placements', () => {
  const november = visibleMonthEvents([...events, cross], '2026-11');
  assert.deepEqual(november.map(e => e.id), ['cross-month', 'november-single']);
  assert.equal(eventDateLabel(november[0]), '31.10.–02.11.2026');
  assert.equal(visibleMonthEvents(events, '2026-10').filter(e => e.id === cross.id).length, 1);
  assert.deepEqual(visibleMonthEvents(events, '2027-02'), []);
});

test('calendar marks each explicit day only in active month, preserving first-event links', () => {
  const october = calendarEvents(events, '2026-10'), november = calendarEvents(events, '2026-11');
  assert.deepEqual([...november.keys()], [1, 2]);
  assert.equal(october.get(31)[0].id, cross.id);
  assert.equal(november.get(1)[0].id, cross.id);
  assert.equal(november.get(2)[0].id, cross.id);
  for (const day of [16, 17, 18]) assert.ok(october.get(day).some(e => e.id === 'same-month'));
});

test('only available non-archived categories, taxonomy order, empty month', () => {
  assert.deepEqual(monthCategories(visibleMonthEvents(events, '2026-10')), EVENT_CATEGORIES);
  assert.deepEqual(monthCategories(visibleMonthEvents(events, '2026-11')).map(c => c.key), ['sunday', 'extended']);
  assert.deepEqual(monthCategories([]), []);
});

test('global store search stays unique and canonical while months repeat placements', async t => {
  const files = storageArtifacts(categoryFixture).files;
  t.mock.method(globalThis, 'fetch', async path => ({ ok: files.has(path), json: async () => JSON.parse(files.get(path)) }));
  const store = createPublicEventStore();
  assert.equal((await store.loadMonth('2026-11')).filter(e => e.id === cross.id).length, 1);
  assert.deepEqual((await store.search('cross-month')).map(e => e.id), [cross.id]);
  assert.deepEqual((await store.search('global-search')).map(e => e.id), ['global-search']);
  assert.equal(eventDateLabel(await store.resolveEvent(cross.id)), '31.10.–02.11.2026');
  const seo = eventSeoArtifacts(categoryFixture, '<urlset><url><loc>https://www.distillery.de/</loc></url></urlset>');
  assert.equal([...seo.files.keys()].filter(p => p === `events/${cross.id}/index.html`).length, 1);
  assert.equal(seo.files.get('sitemap.xml').split(`/events/${cross.id}/`).length - 1, 1);
});
