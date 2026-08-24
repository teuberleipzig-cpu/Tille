import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  assertSafeResidentId,
  projectPublicResident,
  renderResidentHtml,
  residentImage,
  residentMetaDescription,
  residentOutputPath,
  residentPublicUrl,
  residentSeoArtifacts,
  RESIDENT_META_DESCRIPTION_MAX,
  RESIDENT_SOCIAL_IMAGE,
  updateResidentSitemap
} from '../scripts/residents/resident-seo.mjs';
import { prepareResidentSeo, readGeneratedResidentPages } from '../scripts/residents/prepare-resident-seo.mjs';
import { updateEventSitemap } from '../scripts/events/event-seo.mjs';
import { updateNewsSitemap } from '../scripts/news/news-seo.mjs';

const repositorySitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
const residentDocument = JSON.parse(await readFile(new URL('../public/residents/data/residents.json', import.meta.url), 'utf8'));
const residentsPage = await readFile(new URL('../residents.html', import.meta.url), 'utf8');
const directorySource = await readFile(new URL('../public/site/js/resident-directory.js', import.meta.url), 'utf8');
const releasesPage = await readFile(new URL('../resident-releases.html', import.meta.url), 'utf8');

function fixture(overrides = {}) {
  return {
    id: 'test-resident',
    name: 'Test & Resident',
    city: 'Leipzig',
    genre: 'House < Techno',
    labels: ['Label One', 'Label "Two"'],
    relatedProjects: ['Project > One'],
    pressText: 'Public press text.',
    bio: 'Public biography.',
    photoList: [{ url: 'public/residents/media/test/photo.jpg' }],
    instagram: 'https://example.com/profile?a=1&b=2',
    bookingEmail: 'booking@example.com',
    presskitUrl: 'public/residents/media/test/presskit.pdf',
    newsItems: [{ date: '2026-09-01', text: 'Public news < one' }],
    releases: [{
      id: 'release-one', title: 'Release & One', releaseDate: '2026-08-01', year: '2026', label: 'Label < One',
      releaseType: 'EP', format: 'Vinyl', country: 'DE', artists: ['A & B'], tracks: ['Track < One'],
      description: 'Release > description', coverImage: 'public/residents/media/test/cover.jpg',
      discogsUrl: 'https://example.com/discogs?a=1&b=2', published: true
    }],
    ...overrides
  };
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
}

function sitemapBlock(xml, location) {
  return [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => match[0]).find(block => block.includes(`<loc>${location}</loc>`));
}

function eventFixture() {
  return { id: 'event-one', date: '2026-09-12', title: 'Event One', sections: [] };
}

async function writeWorkspace(root, residents = [fixture()]) {
  await mkdir(path.join(root, 'public/residents/data'), { recursive: true });
  await writeFile(path.join(root, 'public/residents/data/residents.json'), `${JSON.stringify({ residents }, null, 2)}\n`, 'utf8');
  await writeFile(path.join(root, 'sitemap.xml'), repositorySitemap, 'utf8');
}

test('safe Resident ID, canonical URL and output path use the explicit ID', () => {
  assert.equal(assertSafeResidentId('shuray-walle'), 'shuray-walle');
  assert.equal(residentPublicUrl('shuray-walle'), 'https://www.distillery.de/residents/shuray-walle/');
  assert.equal(residentOutputPath('shuray-walle'), 'residents/shuray-walle/index.html');
});

for (const id of ['', '.', '..', '../x', 'x/y', 'x\\y', 'a b', '%2e%2e', '%2f', 'x\0y']) {
  test(`unsafe Resident ID rejected: ${JSON.stringify(id)}`, () => assert.throws(() => assertSafeResidentId(id), /Unsichere Resident-ID/));
}

test('case-folded Resident output collision is rejected', () => {
  assert.throws(() => residentSeoArtifacts({ residents: [fixture({ id: 'Resident' }), fixture({ id: 'resident' })] }, repositorySitemap), /Kollision der Resident-Outputpfade/);
});

test('public projection is an explicit allowlist', () => {
  const projected = projectPublicResident(fixture({ unknownInternalField: 'internal', portal: { code: 'secret' }, embeds: '<iframe></iframe>' }));
  assert.deepEqual(Object.keys(projected), ['id', 'name', 'city', 'genre', 'labels', 'relatedProjects', 'pressText', 'bio', 'photos', 'socials', 'bookingEmail', 'presskit', 'news', 'newsItems', 'releases']);
  for (const key of ['portal', 'unknownInternalField', 'embeds', 'mediaEmbeds']) assert.equal(Object.hasOwn(projected, key), false);
});

test('HTML and artifact output are deterministic', () => {
  const html = renderResidentHtml(fixture());
  assert.equal(renderResidentHtml(fixture()), html);
  const once = residentSeoArtifacts({ residents: [fixture()] }, repositorySitemap);
  const twice = residentSeoArtifacts({ residents: [fixture()] }, repositorySitemap);
  assert.deepEqual([...once.files], [...twice.files]);
});

test('title, canonical, OG, Twitter and static H1 are individual and escaped', () => {
  const html = renderResidentHtml(fixture());
  const canonical = residentPublicUrl('test-resident');
  assert.match(html, /<title>Test &amp; Resident – Distillery Leipzig Resident<\/title>/);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}">`));
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<h1 class="resident-title">Test &amp; Resident<\/h1>/);
});

test('content and link attributes are HTML escaped and external links hardened', () => {
  const html = renderResidentHtml(fixture());
  assert.match(html, /House &lt; Techno/);
  assert.match(html, /Label &quot;Two&quot;/);
  assert.match(html, /Project &gt; One/);
  assert.match(html, /profile\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /discogs\?a=1&amp;b=2" target="_blank" rel="noopener noreferrer"/);
});

test('meta description prioritizes press text then bio then deterministic fallback', () => {
  assert.equal(residentMetaDescription(fixture()), 'Public press text.');
  assert.equal(residentMetaDescription(fixture({ pressText: '' })), 'Public biography.');
  assert.equal(residentMetaDescription(fixture({ pressText: '', bio: '' })), 'Test & Resident ist Resident der Distillery Leipzig. Genre: House < Techno. Aus Leipzig.');
});

test('meta description normalizes whitespace and truncates at a useful boundary', () => {
  const result = residentMetaDescription(fixture({ pressText: `  ${'Long resident description '.repeat(20)}  ` }));
  assert.ok(result.length <= RESIDENT_META_DESCRIPTION_MAX);
  assert.ok(result.endsWith('…'));
  assert.doesNotMatch(result, /\s{2}/);
});

test('image priority resolves local paths to an absolute social image', () => {
  assert.equal(residentImage(fixture()), 'https://www.distillery.de/public/residents/media/test/photo.jpg');
  const html = renderResidentHtml(fixture());
  assert.match(html, /src="public\/residents\/media\/test\/photo\.jpg"/);
});

test('photos fallback to photos then imageUrl and reject data/blob URLs', () => {
  assert.equal(residentImage(fixture({ photoList: [], photos: ['/residents/media/test/second.jpg'] })), 'https://www.distillery.de/public/residents/media/test/second.jpg');
  assert.equal(residentImage(fixture({ photoList: [], photos: [], imageUrl: '/public/residents/media/test/fallback.jpg' })), 'https://www.distillery.de/public/residents/media/test/fallback.jpg');
  assert.equal(residentImage(fixture({ photoList: [{ url: 'data:image/png;base64,x' }], photos: ['blob:test'], imageUrl: 'javascript:x' })), RESIDENT_SOCIAL_IMAGE);
});

test('primary public profile fields are present without residents JSON fetch', () => {
  const html = renderResidentHtml(fixture());
  for (const value of ['Leipzig', 'House &lt; Techno', 'Label One', 'Project &gt; One', 'Public press text.', 'Instagram', 'mailto:booking@example.com', 'Presskit', 'Public news &lt; one']) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /fetch\(|residents\.json/);
});

test('published releases include all public details and escaped values', () => {
  const html = renderResidentHtml(fixture());
  for (const value of ['Release &amp; One', '2026-08-01', 'Label &lt; One', 'EP', 'Vinyl', 'DE', 'A &amp; B', 'Track &lt; One', 'Release &gt; description']) assert.ok(html.includes(value));
});

test('published=false releases and their news are excluded', () => {
  const hidden = { ...fixture().releases[0], title: 'PRIVATE RELEASE SENTINEL', autoNewsText: 'PRIVATE NEWS SENTINEL', published: false };
  const html = renderResidentHtml(fixture({ releases: [hidden] }));
  assert.doesNotMatch(html, /PRIVATE (?:RELEASE|NEWS) SENTINEL/);
});

test('every published release is emitted rather than a five-item preview', () => {
  const releases = Array.from({ length: 7 }, (_, index) => ({ title: `Release ${index + 1}`, releaseDate: `2026-0${index + 1}-01`, published: true }));
  const html = renderResidentHtml(fixture({ releases }));
  assert.equal((html.match(/class="release-row"/g) || []).length, 7);
});

test('portal invite code unknown fields and raw embeds never reach any HTML surface', () => {
  const sentinels = ['SEO-SECRET-INVITE-SENTINEL', 'SEO-SECRET-CODE-SENTINEL', 'SEO-SECRET-VERSION-SENTINEL', 'SEO-SECRET-DATE-SENTINEL', 'SEO-INTERNAL-SENTINEL', 'SEO-EMBED-SENTINEL'];
  const html = renderResidentHtml(fixture({
    portal: { enabled: true, inviteId: sentinels[0], code: sentinels[1], version: sentinels[2], updatedAt: sentinels[3] },
    unknownInternalField: sentinels[4], embeds: `<iframe>${sentinels[5]}</iframe>`, mediaEmbeds: `<script>${sentinels[5]}</script>`
  }));
  for (const sentinel of sentinels) assert.doesNotMatch(html, new RegExp(sentinel));
  assert.doesNotMatch(html, /<iframe|application\/ld\+json|"@type"\s*:\s*"(?:Person|MusicGroup|Organization)"/i);
});

test('deep output uses the existing shell owners and no Resident entity JSON-LD', () => {
  const html = renderResidentHtml(fixture());
  assert.match(html, /<base href="\.\.\/\.\.\/">/);
  assert.match(html, /<body data-site-page="residents">/);
  assert.match(html, /assets\/site-navigation\.js\?v=site-navigation-8/);
  assert.match(html, /assets\/mobile-navigation\.css\?v=mobile-navigation-7/);
  assert.match(html, /back to residents/);
  assert.doesNotMatch(html, /application\/ld\+json/);
});

test('Resident sitemap owner replaces only Resident profile URLs and adds no lastmod', () => {
  const stale = repositorySitemap.replace('</urlset>', '  <url>\n    <loc>https://www.distillery.de/residents/stale/</loc>\n  </url>\n</urlset>');
  const output = updateResidentSitemap(stale, [fixture({ id: 'z-resident' }), fixture({ id: 'a-resident' })]);
  const residentUrls = sitemapLocations(output).filter(url => /^https:\/\/www\.distillery\.de\/residents\/.+\/$/.test(url));
  assert.deepEqual(residentUrls, [residentPublicUrl('a-resident'), residentPublicUrl('z-resident')]);
  assert.doesNotMatch(output, /residents\/stale\//);
  for (const url of residentUrls) assert.doesNotMatch(sitemapBlock(output, url), /<lastmod>/);
});

test('Resident sitemap update preserves root, overview, Event and News URL blocks', () => {
  const output = updateResidentSitemap(repositorySitemap, [fixture()]);
  for (const url of ['https://www.distillery.de/', 'https://www.distillery.de/residents.html', 'https://www.distillery.de/news/', 'https://www.distillery.de/news/distillery-news-test/']) assert.ok(sitemapLocations(output).includes(url));
  const eventUrl = sitemapLocations(repositorySitemap).find(url => url.includes('/events/'));
  assert.ok(eventUrl && sitemapLocations(output).includes(eventUrl));
  assert.equal(sitemapBlock(output, eventUrl), sitemapBlock(repositorySitemap, eventUrl));
});

test('Event sitemap updater preserves Resident profile URLs', () => {
  const withResident = updateResidentSitemap(repositorySitemap, [fixture()]);
  const output = updateEventSitemap(withResident, [eventFixture()]);
  assert.ok(sitemapLocations(output).includes(residentPublicUrl('test-resident')));
});

test('News sitemap updater preserves Resident profile URLs', () => {
  const withResident = updateResidentSitemap(repositorySitemap, [fixture()]);
  const output = updateNewsSitemap(withResident, [{ slug: 'article', publishedAt: '2026-08-22T10:00:00', modifiedAt: '2026-08-22T10:00:00' }]);
  assert.ok(sitemapLocations(output).includes(residentPublicUrl('test-resident')));
});

test('all production Residents create exactly one safe page and sitemap URL', () => {
  const output = residentSeoArtifacts(residentDocument, repositorySitemap);
  assert.equal(output.publicResidents.length, 3);
  assert.deepEqual(output.publicResidents.map(resident => resident.id), ['bigalke', 'shuray-walle', 'submod']);
  assert.deepEqual([...output.files.keys()].filter(file => file !== 'sitemap.xml'), ['residents/bigalke/index.html', 'residents/shuray-walle/index.html', 'residents/submod/index.html']);
  for (const resident of output.publicResidents) assert.ok(sitemapLocations(output.files.get('sitemap.xml')).includes(residentPublicUrl(resident.id)));
});

test('generator reads only the exact residents JSON contract', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-resident-seo-source-'));
  try {
    await writeWorkspace(root);
    await writeFile(path.join(root, 'public/residents/data/recovery.json'), '{not json', 'utf8');
    const result = await prepareResidentSeo({ workspaceRoot: root, expectedCount: 1 });
    assert.equal(result.publicResidentCount, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('stale owned Resident page removal and second run no change', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-resident-seo-'));
  try {
    await writeWorkspace(root);
    const stale = path.join(root, 'residents/stale/index.html');
    await mkdir(path.dirname(stale), { recursive: true });
    await writeFile(stale, 'stale', 'utf8');
    const first = await prepareResidentSeo({ workspaceRoot: root, expectedCount: 1 });
    assert.deepEqual(first.stalePages, ['residents/stale/index.html']);
    await assert.rejects(readFile(stale));
    const second = await prepareResidentSeo({ workspaceRoot: root, expectedCount: 1 });
    assert.equal(second.hasChanges, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('unknown foreign Resident output fails closed without deletion', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-resident-seo-foreign-'));
  try {
    const foreign = path.join(root, 'residents/safe-resident/foreign.txt');
    await mkdir(path.dirname(foreign), { recursive: true });
    await writeFile(foreign, 'keep', 'utf8');
    await assert.rejects(() => readGeneratedResidentPages(root), /Unerwarteter Resident-Output/);
    assert.equal(await readFile(foreign, 'utf8'), 'keep');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('check mode reports drift without mutating output', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-resident-seo-check-'));
  try {
    await writeWorkspace(root);
    const beforeSitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
    const result = await prepareResidentSeo({ workspaceRoot: root, expectedCount: 1, write: false });
    assert.equal(result.hasChanges, true);
    assert.equal(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), beforeSitemap);
    assert.equal((await readGeneratedResidentPages(root)).size, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('expected Resident count mismatch fails before output is written', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-resident-seo-count-'));
  try {
    await writeWorkspace(root);
    await assert.rejects(() => prepareResidentSeo({ workspaceRoot: root, expectedCount: 2 }), /Erwartet wurden 2/);
    assert.equal((await readGeneratedResidentPages(root)).size, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('legacy Resident query and B1 internal links remain unchanged', () => {
  assert.match(residentsPage, /new URLSearchParams\(location\.search\)\.get\('resident'\)/);
  assert.match(residentsPage, /href="residents\.html\?resident=\$\{encodeURIComponent\(rid\(r\)\)\}"/);
  assert.match(directorySource, /href: `residents\.html\?resident=\$\{encodeURIComponent\(id\)\}`/);
  assert.doesNotMatch(directorySource, /`residents\/\$\{/);
});

test('resident releases stays functional and is noindex follow', () => {
  assert.match(releasesPage, /<meta name="robots" content="noindex,follow">/);
  assert.match(releasesPage, /new URLSearchParams\(location\.search\)\.get\('resident'\)/);
  assert.match(releasesPage, /fetch\(DATA_URL/);
  assert.match(releasesPage, /residents\.html\?resident=/);
});

test('committed Resident pages exactly match the deterministic production artifacts', async () => {
  const output = residentSeoArtifacts(residentDocument, repositorySitemap);
  for (const [file, content] of output.files) {
    if (file === 'sitemap.xml') continue;
    assert.equal(await readFile(new URL(`../${file}`, import.meta.url), 'utf8'), content);
  }
});
