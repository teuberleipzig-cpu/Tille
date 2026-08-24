import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { updateNewsSitemap } from '../scripts/news/news-seo.mjs';

const gallery = await readFile(new URL('../gallery.html', import.meta.url), 'utf8');
const galleryPage = await readFile(new URL('../public/gallery/js/gallery-page.js', import.meta.url), 'utf8');
const galleryData = JSON.parse(await readFile(new URL('../public/gallery/data/gallery.json', import.meta.url), 'utf8'));
const feedback = await readFile(new URL('../feedback.html', import.meta.url), 'utf8');
const feedbackThanks = await readFile(new URL('../feedback-thanks.html', import.meta.url), 'utf8');
const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');

const GALLERY_URL = 'https://www.distillery.de/gallery.html';
const FEEDBACK_URL = 'https://www.distillery.de/feedback.html';
const NEWS_URL = 'https://www.distillery.de/news/';
const SEO_FOUNDATION_FIXTURE = { slug: 'seo-foundation-fixture', publishedAt: '2026-01-02T03:04:05', modifiedAt: '2026-01-02T03:04:05' };
const SEO_FOUNDATION_FIXTURE_URL = `${NEWS_URL}${SEO_FOUNDATION_FIXTURE.slug}/`;

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
}

test('Gallery has its production canonical', () => {
  assert.match(gallery, /<link rel="canonical" href="https:\/\/www\.distillery\.de\/gallery\.html">/);
});

test('Gallery remains noindex while committed gallery dataset has no published playlists', () => {
  assert.equal(galleryData.playlists.filter(playlist => playlist.enabled).length, 0);
  assert.match(gallery, /<meta name="robots" content="noindex,follow">/);
});

test('Gallery has complete OpenGraph metadata', () => {
  const expected = new Map([
    ['title', 'Gallery – Distillery Leipzig'],
    ['description', 'Historische Fotogalerien der Distillery Leipzig.'],
    ['type', 'website'],
    ['url', GALLERY_URL],
    ['site_name', 'Distillery Leipzig'],
    ['image', 'https://www.distillery.de/assets/social-preview.svg'],
    ['image:width', '1200'],
    ['image:height', '630'],
    ['image:alt', 'Distillery Leipzig – Dates, Residents, Club']
  ]);
  for (const [property, content] of expected) {
    assert.ok(gallery.includes(`<meta property="og:${property}" content="${content}">`), `missing og:${property}`);
  }
});

test('Gallery has a large Twitter card using the existing social preview', () => {
  assert.match(gallery, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(gallery, /<meta name="twitter:image" content="https:\/\/www\.distillery\.de\/assets\/social-preview\.svg">/);
});

test('Gallery has manifest and theme color metadata', () => {
  assert.match(gallery, /<link rel="manifest" href="site\.webmanifest">/);
  assert.match(gallery, /<meta name="theme-color" content="#000000">/);
});

test('Gallery initial HTML contains exactly one Gallery H1 inside its render root', () => {
  const root = /<div id="gallery-content" class="gallery-content">([\s\S]*?)<\/div>/.exec(gallery);
  assert.ok(root);
  assert.equal((gallery.match(/<h1\b/g) || []).length, 1);
  assert.match(root[1], /<h1>Gallery<\/h1>/);
});

test('Gallery renderer replaces its root with exactly one H1 in every runtime path', () => {
  const replacements = [...galleryPage.matchAll(/root\.innerHTML\s*=\s*([\s\S]*?);/g)].map(match => match[1]);
  assert.equal(replacements.length, 4);
  for (const replacement of replacements) assert.equal((replacement.match(/<h1\b/g) || []).length, 1);
});

test('Gallery is absent from sitemap while the committed dataset has no published playlists', () => {
  assert.equal(galleryData.playlists.filter(playlist => playlist.enabled).length, 0);
  assert.equal(sitemapLocations(sitemap).includes(GALLERY_URL), false);
});

test('Feedback is noindex follow and keeps its production canonical', () => {
  assert.match(feedback, /<meta name="robots" content="noindex,follow">/);
  assert.match(feedback, /<link rel="canonical" href="https:\/\/www\.distillery\.de\/feedback\.html">/);
});

test('Feedback is absent from sitemap', () => {
  assert.equal(sitemapLocations(sitemap).includes(FEEDBACK_URL), false);
});

test('Feedback form contract remains present', () => {
  assert.match(feedback, /<form class="feedback-form" action="https:\/\/formsubmit\.co\/teuber1995@gmail\.com" method="POST">/);
  assert.match(feedback, /id="feedback-message"[^>]*required/);
  assert.match(feedback, /type="submit">Send feedback<\/button>/);
});

test('Feedback thanks remains noindex follow', () => {
  assert.match(feedbackThanks, /<meta name="robots" content="noindex,follow">/);
});

test('Production robots remains crawlable and declares its production sitemap once', () => {
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.doesNotMatch(robots, /^Disallow:/m);
  assert.equal((robots.match(/^Sitemap: https:\/\/www\.distillery\.de\/sitemap\.xml$/gm) || []).length, 1);
});

test('Sitemap retains central public and legal URLs', () => {
  const locations = sitemapLocations(sitemap);
  for (const location of [
    'https://www.distillery.de/',
    'https://www.distillery.de/residents.html',
    'https://www.distillery.de/resident-releases.html',
    'https://www.distillery.de/about.html',
    'https://www.distillery.de/contact.html',
    'https://www.distillery.de/history.html',
    'https://www.distillery.de/impressum.html',
    'https://www.distillery.de/datenschutz.html'
  ]) assert.ok(locations.includes(location), `missing ${location}`);
});

test('Sitemap retains the News overview URL', () => {
  const locations = sitemapLocations(sitemap);
  assert.ok(locations.includes(NEWS_URL));
});

test('WordPress News sitemap sync preserves the new non-News indexability policy', () => {
  const synced = updateNewsSitemap(sitemap, [SEO_FOUNDATION_FIXTURE]);
  const locations = sitemapLocations(synced);
  assert.equal(locations.includes(FEEDBACK_URL), false);
  assert.equal(locations.includes(GALLERY_URL), false);
  assert.ok(locations.includes(NEWS_URL));
  assert.ok(locations.includes(SEO_FOUNDATION_FIXTURE_URL));
  for (const location of [
    'https://www.distillery.de/',
    'https://www.distillery.de/residents.html',
    'https://www.distillery.de/contact.html',
    'https://www.distillery.de/impressum.html'
  ]) assert.ok(locations.includes(location), `missing ${location}`);
});

test('Affected pages contain no staging canonical', () => {
  for (const html of [gallery, feedback]) assert.doesNotMatch(html, /(?:canonical|og:url)[^>]+www-test\.distillery\.de/i);
});
