import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { storageArtifacts } from '../public/site/js/event-storage-model.js';
import {
  assertSafeEventId,
  EVENT_META_DESCRIPTION_MAX,
  EVENT_SOCIAL_IMAGE,
  eventImageUrl,
  eventJsonLd,
  eventMetaDescription,
  eventOutputPath,
  eventPublicUrl,
  eventSeoArtifacts,
  renderEventHtml,
  serializeEventJsonLd,
  updateEventSitemap
} from '../scripts/events/event-seo.mjs';
import { prepareEventSeo, readGeneratedEventPages } from '../scripts/events/prepare-event-seo.mjs';
import { updateNewsSitemap } from '../scripts/news/news-seo.mjs';

const fixture = (overrides = {}) => ({
  id: 'fm-56116ab2-345a-4834-8d05-7429a773a157',
  date: '2026-09-12',
  title: 'CSV Test Night',
  color: 'orange',
  moreUrl: '',
  imageUrl: '',
  description: '',
  sections: [{ label: 'up:', genre: 'House', items: [
    { name: 'Test Artist', info: 'Live', link: 'https://example.com/artist?a=1&b=2' },
    { name: 'Second Artist', info: 'DJ Set', link: '' }
  ] }],
  ...overrides
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.distillery.de/</loc>
    <lastmod>2026-07-01</lastmod>
  </url>
  <url>
    <loc>https://www.distillery.de/news/</loc>
    <lastmod>2026-08-21</lastmod>
  </url>
  <url>
    <loc>https://www.distillery.de/news/article/</loc>
    <lastmod>2026-08-21</lastmod>
  </url>
  <url>
    <loc>https://www.distillery.de/contact.html</loc>
    <lastmod>2026-07-01</lastmod>
  </url>
</urlset>
`;
const publicIndexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const legacyEventHtml = await readFile(new URL('../event.html', import.meta.url), 'utf8');

function jsonLdFrom(html) {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(matches.length, 1);
  return JSON.parse(matches[0][1]);
}

function locations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

async function writeWorkspace(root, document, sitemapValue = sitemap) {
  for (const [file, content] of storageArtifacts(document).files) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  await writeFile(path.join(root, 'sitemap.xml'), sitemapValue, 'utf8');
}

test('safe ID accepted', () => assert.equal(assertSafeEventId('fm-Az_09.test-1'), 'fm-Az_09.test-1'));
test('stable URL uses only the effective event ID', () => assert.equal(eventPublicUrl(fixture().id), `https://www.distillery.de/events/${fixture().id}/`));
test('stable output path uses the same ID', () => assert.equal(eventOutputPath(fixture().id), `events/${fixture().id}/index.html`));

for (const id of ['', '.', '..', '../x', 'x/y', 'x\\y', 'a b', '%2e%2e', '%2f', 'x\0y']) {
  test(`unsafe ID rejected: ${JSON.stringify(id)}`, () => assert.throws(() => assertSafeEventId(id), /Unsichere Event-ID/));
}

test('effective ID collision is rejected', () => {
  assert.throws(() => eventSeoArtifacts({ events: [fixture(), fixture({ title: 'Other' })] }, sitemap), /Kollision/);
});

test('case-folded output collision is rejected', () => {
  assert.throws(() => eventSeoArtifacts({ events: [fixture({ id: 'Same' }), fixture({ id: 'same' })] }, sitemap), /Outputpfade/);
});

test('HTML output is deterministic', () => assert.equal(renderEventHtml(fixture()), renderEventHtml(fixture())));
test('artifact map is deterministic', () => {
  const first = eventSeoArtifacts({ events: [fixture()] }, sitemap);
  const second = eventSeoArtifacts({ events: [fixture()] }, sitemap);
  assert.deepEqual([...first.files], [...second.files]);
});

test('title and visible content are HTML escaped', () => {
  const html = renderEventHtml(fixture({ title: 'A & <B> "C"', sections: [{ label: '<up>', genre: 'A&B', items: [{ name: '<Artist>', info: '"Live"', link: '' }] }] }));
  assert.match(html, /<title>A &amp; &lt;B&gt; &quot;C&quot; – Distillery Leipzig<\/title>/);
  assert.match(html, /&lt;up&gt;/);
  assert.match(html, /&lt;Artist&gt;/);
  assert.doesNotMatch(html, /<Artist>/);
});

test('attribute values and external artist links are escaped and hardened', () => {
  const html = renderEventHtml(fixture());
  assert.match(html, /href="https:\/\/example\.com\/artist\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
});

test('unsafe artist links are rendered as text', () => {
  const html = renderEventHtml(fixture({ sections: [{ label: '', items: [{ name: 'Unsafe', link: 'javascript:alert(1)' }] }] }));
  assert.match(html, /<strong>Unsafe<\/strong>/);
  assert.doesNotMatch(html, /javascript:/i);
});

test('JSON-LD serializer blocks script termination and remains parseable', () => {
  const value = { text: '</script><script>x</script>&\u2028\u2029' };
  const serialized = serializeEventJsonLd(value);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(serialized), value);
});

test('individual title, canonical, OG and Twitter metadata are static', () => {
  const event = fixture(), html = renderEventHtml(event), canonical = eventPublicUrl(event.id);
  assert.match(html, /<title>CSV Test Night – Distillery Leipzig<\/title>/);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
});

test('real description is whitespace-normalized and bounded', () => {
  const description = `  ${'Long description '.repeat(30)}  `;
  const result = eventMetaDescription(fixture({ description }));
  assert.ok(result.length <= EVENT_META_DESCRIPTION_MAX);
  assert.ok(result.endsWith('…'));
  assert.doesNotMatch(result, /\s{2}/);
});

test('description fallback uses title date venue and lineup', () => {
  assert.equal(eventMetaDescription(fixture()), 'CSV Test Night am 12.09.2026 in der Distillery Leipzig. Test Artist, Second Artist');
});

test('description fallback without lineup ends after venue', () => {
  assert.equal(eventMetaDescription(fixture({ sections: [] })), 'CSV Test Night am 12.09.2026 in der Distillery Leipzig.');
});

test('local image resolves to absolute production URL', () => {
  const event = fixture({ imageUrl: 'public/events/media/shared/event.jpg' });
  assert.equal(eventImageUrl(event), 'https://www.distillery.de/public/events/media/shared/event.jpg');
  const html = renderEventHtml(event);
  assert.match(html, /<img class="event-hero" src="public\/events\/media\/shared\/event\.jpg"/);
  assert.doesNotMatch(html, /og:image:width/);
});

test('empty and unsafe images use social preview fallback', () => {
  assert.equal(eventImageUrl(fixture()), EVENT_SOCIAL_IMAGE);
  assert.equal(eventImageUrl(fixture({ imageUrl: 'data:image/png;base64,x' })), EVENT_SOCIAL_IMAGE);
  const html = renderEventHtml(fixture());
  assert.match(html, /og:image:width" content="1200"/);
  assert.doesNotMatch(html, /class="event-hero"/);
});

test('primary event content is static without an event fetch', () => {
  const html = renderEventHtml(fixture({ description: 'Static description' }));
  assert.match(html, /<h1 class="event-title orange">/);
  assert.match(html, /12\.09\.2026/);
  assert.match(html, /Test Artist/);
  assert.match(html, /Second Artist/);
  assert.match(html, /Static description/);
  assert.doesNotMatch(html, /event-store|resolveEvent|fetch\(/);
});

test('deep paths use a root base and the existing site owners', () => {
  const html = renderEventHtml(fixture());
  assert.match(html, /<base href="\.\.\/\.\.\/">/);
  assert.match(html, /<body data-site-page="dates">/);
  assert.match(html, /assets\/site-navigation\.js\?v=site-navigation-8/);
  assert.match(html, /assets\/mobile-navigation\.css\?v=mobile-navigation-7/);
});

test('JSON-LD contains only the supported minimal event contract', () => {
  const data = eventJsonLd(fixture());
  assert.equal(data['@type'], 'Event');
  assert.equal(data.startDate, '2026-09-12');
  assert.equal(data.location.name, 'Distillery Leipzig');
  assert.deepEqual(data.location.address, {
    '@type': 'PostalAddress', streetAddress: 'Eggebrechtstraße 2', postalCode: '04103', addressLocality: 'Leipzig', addressCountry: 'DE'
  });
  for (const field of ['endDate', 'eventStatus', 'eventAttendanceMode', 'organizer', 'performer', 'offers']) assert.equal(Object.hasOwn(data, field), false);
  assert.deepEqual(jsonLdFrom(renderEventHtml(fixture())), data);
});

test('archived event generates neither page nor sitemap URL', () => {
  const archived = fixture({ status: 'archived' });
  const output = eventSeoArtifacts({ events: [archived] }, sitemap);
  assert.equal(output.publicEvents.length, 0);
  assert.equal(output.files.has(eventOutputPath(archived.id)), false);
  assert.doesNotMatch(output.files.get('sitemap.xml'), /\/events\//);
});

test('event sitemap update preserves non-event blocks and News URLs', () => {
  const output = updateEventSitemap(sitemap, [fixture()]);
  for (const url of ['https://www.distillery.de/', 'https://www.distillery.de/news/', 'https://www.distillery.de/news/article/', 'https://www.distillery.de/contact.html']) assert.ok(locations(output).includes(url));
  assert.ok(locations(output).includes(eventPublicUrl(fixture().id)));
  const sourceBlocks = [...sitemap.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => match[0]);
  const outputBlocks = [...output.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => match[0]);
  for (const block of sourceBlocks) assert.ok(outputBlocks.includes(block));
});

test('event sitemap URLs are sorted, unique, deterministic and have no lastmod', () => {
  const a = fixture({ id: 'z-event' }), b = fixture({ id: 'a-event' });
  const once = updateEventSitemap(sitemap, [a, b]);
  assert.equal(updateEventSitemap(once, [a, b]), once);
  const eventLocations = locations(once).filter(url => url.includes('/events/'));
  assert.deepEqual(eventLocations, [eventPublicUrl('a-event'), eventPublicUrl('z-event')]);
  const blocks = [...once.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => match[0]);
  for (const url of eventLocations) {
    const block = blocks.find(value => value.includes(`<loc>${url}</loc>`));
    assert.doesNotMatch(block, /<lastmod>/);
  }
});

test('WordPress News sitemap update preserves Event URLs', () => {
  const withEvent = updateEventSitemap(sitemap, [fixture()]);
  const output = updateNewsSitemap(withEvent, [{ slug: 'new-article', publishedAt: '2026-08-22T10:00:00', modifiedAt: '2026-08-22T10:00:00' }]);
  assert.ok(locations(output).includes(eventPublicUrl(fixture().id)));
});

test('public index retains legacy Event URLs until FileMaker SEO automation is complete', () => {
  assert.match(publicIndexHtml, /function eventDetailUrl\(e\)\{const p=new URLSearchParams\(\);p\.set\('event',getEventId\(e\)\);[^}]+return`index\.html\?\$\{p\}`\}/);
  assert.doesNotMatch(publicIndexHtml, /function eventDetailUrl\(e\)\{return`events\/\$\{encodeURIComponent\(getEventId\(e\)\)\}\/`\}/);
  assert.match(publicIndexHtml, /new URLSearchParams\(location\.search\)\.get\('event'\)/);
  assert.match(publicIndexHtml, /eventStore\.resolveEvent\(detail\)/);
});

test('legacy event.html remains functional but is noindex follow', () => {
  assert.match(legacyEventHtml, /<meta name="robots" content="noindex,follow">/);
  assert.match(legacyEventHtml, /eventStore\.resolveEvent\(id\)/);
  assert.doesNotMatch(legacyEventHtml, /www-test\.distillery\.de|rel="canonical"/);
});

test('stale owned output is removed and second run is a no-change', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-event-seo-'));
  try {
    await writeWorkspace(root, { meta: {}, events: [fixture()] });
    const stale = path.join(root, 'events/stale-event/index.html');
    await mkdir(path.dirname(stale), { recursive: true });
    await writeFile(stale, 'stale', 'utf8');
    const first = await prepareEventSeo({ workspaceRoot: root, expectedCount: 1 });
    assert.deepEqual(first.stalePages, ['events/stale-event/index.html']);
    await assert.rejects(readFile(stale));
    const second = await prepareEventSeo({ workspaceRoot: root, expectedCount: 1 });
    assert.equal(second.hasChanges, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unexpected foreign output fails closed without deletion', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-event-seo-foreign-'));
  try {
    const foreign = path.join(root, 'events/safe-event/foreign.txt');
    await mkdir(path.dirname(foreign), { recursive: true });
    await writeFile(foreign, 'keep', 'utf8');
    await assert.rejects(() => readGeneratedEventPages(root), /Unerwarteter Event-Output/);
    assert.equal(await readFile(foreign, 'utf8'), 'keep');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('expected public count mismatch fails before output is written', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-event-seo-count-'));
  try {
    await writeWorkspace(root, { meta: {}, events: [fixture()] });
    await assert.rejects(() => prepareEventSeo({ workspaceRoot: root, expectedCount: 2 }), /Erwartet wurden 2/);
    await assert.rejects(readGeneratedEventPages(root).then(files => files.size ? Promise.resolve() : Promise.reject(new Error('empty'))), /empty/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
