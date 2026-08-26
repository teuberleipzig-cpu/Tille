import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildEventImageOnlySavePlan,
  normalizeEventImageUrl,
  patchFreshEventImage,
  saveEventImageOnly
} from '../public/admin/js/core/event-image-only-save.js';
import { updateEventSitemap } from '../scripts/events/event-seo.mjs';

const TARGET_ID = 'fm-11111111-1111-4111-8111-111111111111';
const OTHER_ID = 'fm-22222222-2222-4222-8222-222222222222';
const POSTER = 'public/events/media/fm-event/poster.jpg';
const baseDocument = () => ({
  meta: { artists: [{ name: 'Meta Artist', future: { keep: true } }], unknownMeta: ['keep'] },
  futureTopLevel: { keep: true },
  events: [
    {
      id: TARGET_ID,
      date: '2026-09-12',
      title: 'Fresh FileMaker Title',
      color: 'olive',
      moreUrl: 'https://fresh.example/event',
      imageUrl: '',
      description: 'Fresh FileMaker description',
      sections: [{ label: 'up:', genre: 'House', items: [{ name: 'NEW ARTIST', info: 'Live', link: 'https://fresh.example/artist', futureArtist: 1 }], futureSection: 2 }],
      futureEvent: { keep: true }
    },
    { id: OTHER_ID, date: '2026-10-01', title: 'Other event', imageUrl: 'public/events/media/other.jpg', sections: [], future: 7 }
  ]
});
const manifest = {
  metaPath: 'public/events/data/meta.json',
  eventIndexPath: 'public/events/data/event-index.json',
  searchIndexPath: 'public/events/data/search-index.json',
  months: [
    { key: '2026-09', path: 'public/events/data/months/2026-09.json' },
    { key: '2026-10', path: 'public/events/data/months/2026-10.json' }
  ]
};
const sitemapShell = '<?xml version="1.0"?>\n<urlset>\n  <url>\n    <loc>https://www.distillery.de/</loc>\n  </url>\n</urlset>\n';
const canonicalSitemap = document => updateEventSitemap(sitemapShell, document.events);

test('image-only patch changes only target imageUrl on fresh state', () => {
  const fresh = baseDocument();
  const before = structuredClone(fresh);
  const result = patchFreshEventImage(fresh, TARGET_ID, POSTER);
  assert.deepEqual(fresh, before);
  assert.equal(result.event.imageUrl, POSTER);
  const expected = structuredClone(before);
  expected.events[0].imageUrl = POSTER;
  assert.deepEqual(result.document, expected);
});

test('stale Admin artist cannot overwrite fresh FileMaker artist', async () => {
  const fresh = baseDocument();
  let committed;
  const saved = await saveEventImageOnly({
    targetEventId: TARGET_ID,
    requestedImageUrl: POSTER,
    loadFresh: async () => ({ document: fresh, manifest, sitemap: canonicalSitemap(fresh), head: 'fresh-head' }),
    writer: { commitFiles: async input => { committed = input; return { commit: 'new-head', changed: true }; } }
  });
  assert.equal(saved.event.sections[0].items[0].name, 'NEW ARTIST');
  assert.equal(saved.event.imageUrl, POSTER);
  assert.equal(committed.expectedHead, 'fresh-head');
});

test('fresh title date sections description moreUrl color and unknown fields survive image save', () => {
  const fresh = baseDocument();
  const before = structuredClone(fresh.events[0]);
  const { event } = patchFreshEventImage(fresh, TARGET_ID, POSTER);
  for (const field of ['id', 'date', 'title', 'color', 'moreUrl', 'description', 'sections', 'futureEvent']) assert.deepEqual(event[field], before[field]);
});

test('top-level meta and other events remain deep-equal', () => {
  const fresh = baseDocument();
  const result = patchFreshEventImage(fresh, TARGET_ID, POSTER).document;
  assert.deepEqual(result.meta, fresh.meta);
  assert.deepEqual(result.futureTopLevel, fresh.futureTopLevel);
  assert.deepEqual(result.events[1], fresh.events[1]);
});

test('moved event is resolved by stable ID instead of stale array index or month', () => {
  const fresh = baseDocument();
  const [target] = fresh.events.splice(0, 1);
  target.date = '2027-02-04';
  fresh.events.push(target);
  const result = patchFreshEventImage(fresh, TARGET_ID, POSTER);
  assert.equal(result.eventIndex, 1);
  assert.equal(result.event.date, '2027-02-04');
  assert.equal(result.event.imageUrl, POSTER);
});

test('removed event fails closed and never commits', async () => {
  let writes = 0;
  const fresh = baseDocument();
  fresh.events.shift();
  await assert.rejects(() => saveEventImageOnly({
    targetEventId: TARGET_ID,
    requestedImageUrl: POSTER,
    loadFresh: async () => ({ document: fresh, manifest, head: 'fresh-head' }),
    writer: { commitFiles: async () => { writes++; } }
  }), /Event wurde inzwischen entfernt oder geändert\. Bitte neu laden\./);
  assert.equal(writes, 0);
});

test('image-only save loads fresh state once and does not retry a conflict', async () => {
  let loads = 0, writes = 0;
  await assert.rejects(() => saveEventImageOnly({
    targetEventId: TARGET_ID,
    requestedImageUrl: POSTER,
    loadFresh: async () => { loads++; return { document: baseDocument(), manifest, head: 'fresh-head' }; },
    writer: { commitFiles: async () => { writes++; throw new Error('Events-Konflikt: Branch wurde verändert.'); } }
  }), /Konflikt/);
  assert.equal(loads, 1);
  assert.equal(writes, 1);
});

test('save plan refreshes only target static event page and unchanged sitemap is omitted', () => {
  const fresh = baseDocument();
  const plan = buildEventImageOnlySavePlan({ freshDocument: fresh, freshManifest: manifest, currentSitemap: canonicalSitemap(fresh), targetEventId: TARGET_ID, requestedImageUrl: POSTER });
  assert.equal(plan.eventPage, `events/${TARGET_ID}/index.html`);
  assert.equal(plan.files.has(plan.eventPage), true);
  assert.equal(plan.files.has(`events/${OTHER_ID}/index.html`), false);
  assert.equal(plan.files.has('sitemap.xml'), false);
  assert.equal(plan.sitemapChanged, false);
});

test('target static page uses new image and fresh FileMaker content for HTML and social metadata', () => {
  const fresh = baseDocument();
  const plan = buildEventImageOnlySavePlan({ freshDocument: fresh, freshManifest: manifest, targetEventId: TARGET_ID, requestedImageUrl: POSTER });
  const html = plan.files.get(plan.eventPage);
  assert.match(html, /Fresh FileMaker Title/);
  assert.match(html, /NEW ARTIST/);
  assert.match(html, /public\/events\/media\/fm-event\/poster\.jpg/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:image"/);
});

test('image URL contract rejects data blob javascript traversal and credentials', () => {
  for (const value of ['data:image/png;base64,x', 'blob:test', 'javascript:alert(1)', 'public/events/media/../secret.jpg', 'https://u:p@example.test/x.jpg']) {
    assert.throws(() => normalizeEventImageUrl(value));
  }
  assert.equal(normalizeEventImageUrl(''), '');
  assert.equal(normalizeEventImageUrl(POSTER), POSTER);
  assert.equal(normalizeEventImageUrl('https://images.example/poster.jpg'), 'https://images.example/poster.jpg');
});
