import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeWordPressPosts } from '../scripts/news/news-model.mjs';
import { renderArticle, renderOverview } from '../scripts/news/news-render.mjs';
import {
  buildNewsArticleStructuredData,
  newsArticleUrl,
  renderNewsArticleStructuredData,
  serializeJsonLd,
  updateNewsSitemap
} from '../scripts/news/news-seo.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/wordpress-posts.json', import.meta.url), 'utf8'));
const posts = normalizeWordPressPosts(fixtures);
const withImage = posts.find(post => post.featuredImage);
const withoutImage = posts.find(post => !post.featuredImage);
const repositorySitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');

function jsonLdScripts(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => match[1]);
}

function sitemapLocations(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
}

function sitemapBlocks(xml) {
  return new Map([...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(match => [/<loc>([^<]+)<\/loc>/.exec(match[0])[1], match[0]]));
}

test('article contains exactly one parseable NewsArticle JSON-LD script', () => {
  const scripts = jsonLdScripts(renderArticle(withImage));
  assert.equal(scripts.length, 1);
  assert.equal(JSON.parse(scripts[0])['@type'], 'NewsArticle');
});

test('NewsArticle fields use the normalized post and canonical URL', () => {
  const data = buildNewsArticleStructuredData(withImage);
  const canonical = newsArticleUrl(withImage.slug);
  assert.equal(data['@context'], 'https://schema.org');
  assert.equal(data.headline, withImage.title);
  assert.equal(data.description, withImage.excerpt);
  assert.equal(data.url, canonical);
  assert.deepEqual(data.mainEntityOfPage, { '@type': 'WebPage', '@id': canonical });
  assert.equal(data.datePublished, withImage.publishedAt);
  assert.equal(data.dateModified, withImage.modifiedAt);
  assert.deepEqual(data.author, { '@type': 'Organization', name: 'Distillery Leipzig', url: 'https://www.distillery.de/' });
  assert.deepEqual(data.publisher, data.author);
});

test('dateModified falls back to datePublished', () => {
  const post = { ...withImage, modifiedAt: '' };
  assert.equal(buildNewsArticleStructuredData(post).dateModified, post.publishedAt);
});

test('featured image is included exactly when present', () => {
  assert.deepEqual(buildNewsArticleStructuredData(withImage).image, [withImage.featuredImage.url]);
  assert.equal(Object.hasOwn(buildNewsArticleStructuredData(withoutImage), 'image'), false);
});

test('generic social preview is never used as Article image', () => {
  const data = buildNewsArticleStructuredData(withoutImage);
  assert.equal(Object.hasOwn(data, 'image'), false);
  assert.doesNotMatch(JSON.stringify(data), /social-preview\.svg/);
});

test('overview pages do not contain Article structured data', () => {
  assert.equal(jsonLdScripts(renderOverview(posts)).length, 0);
});

test('inline JSON-LD serializer blocks script termination and remains valid JSON', () => {
  const value = { text: '</script><script>alert(1)</script>&\u2028\u2029' };
  const serialized = serializeJsonLd(value);
  assert.doesNotMatch(serialized, /<\/script>/i);
  assert.doesNotMatch(serialized, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(serialized), value);
  const html = renderNewsArticleStructuredData({ ...withImage, title: value.text, excerpt: value.text });
  assert.equal((html.match(/<script\b/g) || []).length, 1);
  assert.equal(jsonLdScripts(html).length, 1);
});

test('article canonical, OG URL and JSON-LD URLs are identical and public', () => {
  const html = renderArticle(withImage);
  const canonical = /<link rel="canonical" href="([^"]+)">/.exec(html)[1];
  const ogUrl = /<meta property="og:url" content="([^"]+)">/.exec(html)[1];
  const data = JSON.parse(jsonLdScripts(html)[0]);
  assert.equal(canonical, newsArticleUrl(withImage.slug));
  assert.equal(ogUrl, canonical);
  assert.equal(data.url, canonical);
  assert.equal(data.mainEntityOfPage['@id'], canonical);
  assert.doesNotMatch(html, /cms-test\.distillery\.de|\/wp-json\/|\/wp-admin\/|wp-login\.php/i);
});

test('sitemap preserves non-News entries and replaces stale News articles', () => {
  const source = repositorySitemap.replace('</urlset>', '  <url>\n    <loc>https://www.distillery.de/news/old-slug/</loc>\n    <lastmod>2025-01-01</lastmod>\n  </url>\n</urlset>');
  const output = updateNewsSitemap(source, [withImage, withoutImage]);
  const beforeBlocks = sitemapBlocks(source), afterBlocks = sitemapBlocks(output);
  for (const location of ['https://www.distillery.de/', 'https://www.distillery.de/residents.html', 'https://www.distillery.de/contact.html']) assert.match(output, new RegExp(location.replaceAll('.', '\\.')));
  for (const [location, block] of beforeBlocks) {
    if (!location.startsWith('https://www.distillery.de/news/')) assert.equal(afterBlocks.get(location), block);
  }
  assert.doesNotMatch(output, /news\/old-slug\//);
  assert.match(output, new RegExp(newsArticleUrl(withImage.slug)));
  assert.match(output, new RegExp(newsArticleUrl(withoutImage.slug)));
});

test('sitemap contains overview once, unique article URLs and no WordPress URLs', () => {
  const output = updateNewsSitemap(repositorySitemap, posts);
  const locations = sitemapLocations(output);
  assert.equal(locations.filter(location => location === 'https://www.distillery.de/news/').length, 1);
  assert.equal(new Set(locations).size, locations.length);
  assert.equal(locations.filter(location => /^https:\/\/www\.distillery\.de\/news\/.+\/$/.test(location)).length, posts.length);
  assert.doesNotMatch(output, /news\.html|cms-test\.distillery\.de|\/wp-json\/|wp-admin/i);
});

test('sitemap lastmod uses modified date with published fallback', () => {
  const modified = { ...withImage, slug: 'modified', modifiedAt: '2026-08-19T12:00:00' };
  const fallback = { ...withoutImage, slug: 'fallback', modifiedAt: '', publishedAt: '2026-08-18T12:00:00' };
  const output = updateNewsSitemap(repositorySitemap, [fallback, modified]);
  assert.match(output, /news\/modified\/[\s\S]*?<lastmod>2026-08-19<\/lastmod>/);
  assert.match(output, /news\/fallback\/[\s\S]*?<lastmod>2026-08-18<\/lastmod>/);
  assert.match(output, /<loc>https:\/\/www\.distillery\.de\/news\/<\/loc>[\s\S]*?<lastmod>2026-08-19<\/lastmod>/);
});

test('sitemap output is byte-deterministic', () => {
  const once = updateNewsSitemap(repositorySitemap, posts);
  assert.equal(updateNewsSitemap(once, posts), once);
});

test('empty posts remove articles and preserve the existing overview block', () => {
  const populated = updateNewsSitemap(repositorySitemap, posts);
  const empty = updateNewsSitemap(populated, []);
  const locations = sitemapLocations(empty);
  assert.equal(locations.filter(location => location === 'https://www.distillery.de/news/').length, 1);
  assert.equal(locations.some(location => /^https:\/\/www\.distillery\.de\/news\/.+\/$/.test(location)), false);
  assert.match(empty, /<loc>https:\/\/www\.distillery\.de\/news\/<\/loc>[\s\S]*?<lastmod>2026-08-11<\/lastmod>/);
});

test('missing sitemap and duplicate overview fail closed', () => {
  assert.throws(() => updateNewsSitemap('', posts), /ungültig/);
  const duplicate = repositorySitemap.replace('</urlset>', '  <url><loc>https://www.distillery.de/news/</loc><lastmod>2026-01-01</lastmod></url>\n</urlset>');
  assert.throws(() => updateNewsSitemap(duplicate, posts), /genau einen/);
});

test('staging removes sitemap and live robots declares it exactly once', async () => {
  const dockerfile = await readFile(new URL('../docker/Dockerfile', import.meta.url), 'utf8');
  const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  assert.match(dockerfile, /rm -f \/usr\/share\/nginx\/html\/sitemap\.xml/);
  assert.equal((robots.match(/^Sitemap: https:\/\/www\.distillery\.de\/sitemap\.xml$/gm) || []).length, 1);
});
