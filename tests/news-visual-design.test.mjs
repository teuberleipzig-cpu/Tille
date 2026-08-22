import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeWordPressPosts } from '../scripts/news/news-model.mjs';
import { renderArticle, renderOverview } from '../scripts/news/news-render.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/wordpress-posts.json', import.meta.url), 'utf8'));
const posts = normalizeWordPressPosts(fixtures);
const withImage = posts.find(post => post.featuredImage);
const withoutImage = posts.find(post => !post.featuredImage);
const css = await readFile(new URL('../assets/news.css', import.meta.url), 'utf8');

test('overview keeps the editorial structure for one and multiple articles', () => {
  for (const source of [[withoutImage], posts]) {
    const html = renderOverview(source);
    assert.equal((html.match(/class="news-list"/g) || []).length, 1);
    assert.equal((html.match(/class="news-card"/g) || []).length, source.length);
    assert.equal((html.match(/class="news-card-meta"/g) || []).length, source.length);
    assert.equal((html.match(/<time datetime=/g) || []).length, source.length);
    assert.equal((html.match(/<h2>/g) || []).length, source.length);
    assert.equal((html.match(/class="news-more"/g) || []).length, source.length);
  }
});

test('overview supports image and no-image cards without placeholders', () => {
  const imageHtml = renderOverview([withImage]);
  const noImageHtml = renderOverview([withoutImage]);
  assert.match(imageHtml, /class="news-card-image"[\s\S]*?<img[^>]+alt="[^"]+"/);
  assert.doesNotMatch(noImageHtml, /news-card-image|placeholder/i);
});

test('overview keeps excerpts optional and long content intact', () => {
  const longTitle = 'Eine sehr lange Distillery Headline '.repeat(8).trim();
  const longExcerpt = 'Ein längerer redaktioneller Einstieg '.repeat(20).trim();
  const html = renderOverview([{ ...withoutImage, title: longTitle, excerpt: longExcerpt }]);
  assert.match(html, new RegExp(longTitle));
  assert.match(html, new RegExp(longExcerpt));
  assert.doesNotMatch(renderOverview([{ ...withoutImage, excerpt: '' }]), /<article class="news-card">[\s\S]*?<p>/);
});

test('article groups title and date in one editorial header', () => {
  const html = renderArticle(withImage);
  assert.equal((html.match(/class="news-article-header"/g) || []).length, 1);
  assert.match(html, /class="news-back"[\s\S]*?<header class="news-article-header">[\s\S]*?<h1>[\s\S]*?<time datetime=/);
  assert.match(html, /class="news-hero"[^>]+alt="[^"]+"/);
  assert.match(html, /class="news-body"/);
});

test('article omits the hero cleanly when no featured image exists', () => {
  const html = renderArticle(withoutImage);
  assert.doesNotMatch(html, /class="news-hero"|placeholder/i);
  assert.match(html, /<header class="news-article-header">[\s\S]*?<div class="news-body">/);
});

test('news CSS defines the core editorial and responsive contracts', () => {
  assert.match(css, /\.news-card\{[^}]*border-bottom:4px solid #000/);
  assert.match(css, /\.news-article-header\{[^}]*display:block[^}]*border-bottom:4px solid #000/);
  assert.match(css, /\.news-body\{[^}]*font-size:14px;line-height:1\.5/);
  assert.match(css, /\.news-body ul,\.news-body ol\{[^}]*padding-left:22px/);
  assert.match(css, /\.news-body img\{[^}]*display:block[^}]*margin:20px 0/);
  assert.match(css, /@media\(max-width:820px\)[\s\S]*?\.news-body\{[^}]*font-size:16px;line-height:1\.55/);
});

test('news visual design avoids corporate card decoration', () => {
  assert.doesNotMatch(css, /border-radius|box-shadow|linear-gradient|radial-gradient/i);
});

test('renderer advances only the News stylesheet cache contract', () => {
  for (const html of [renderOverview(posts), renderArticle(withImage)]) {
    assert.match(html, /news\.css\?v=news-foundation-2/);
    assert.match(html, /mobile-navigation\.css\?v=mobile-navigation-7/);
    assert.match(html, /mobile-foundation\.css\?v=mobile-foundation-4/);
    assert.match(html, /site-navigation\.js\?v=site-navigation-8/);
    assert.match(html, /tracking\.js\?v=tracking-1/);
  }
});
