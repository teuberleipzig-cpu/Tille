import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pagesConfig, assertPagesScope } from '../scripts/wordpress-pages/contract.mjs';
import { fetchPages } from '../scripts/wordpress-pages/page-client.mjs';
import { normalizePage } from '../scripts/wordpress-pages/page-model.mjs';
import { generatePages, renderPage } from '../scripts/wordpress-pages/page-render.mjs';
import { classifyContentPath, validateContentChanges } from '../scripts/content/content-scope.mjs';

const options = { environment: 'staging', wordpressBaseUrl: 'https://cms.example', aboutPageId: '11', historyPageId: '22' };
const raw = (id = 11, html = '<h2>Fixture</h2><p>Editorial</p>') => ({ id, status: 'publish', title: { rendered: 'CMS title' }, content: { rendered: html }, modified: '2026-10-11T10:00:00' });
const response = data => ({ ok: true, status: 200, json: async () => data });
const templates = new Map(['about', 'history'].map(name => [`${name}.html`, readFileSync(new URL(`../${name}.html`, import.meta.url), 'utf8')]));

test('valid distinct positive safe Page IDs and source', () => assert.deepEqual(pagesConfig(options), { baseUrl: 'https://cms.example', about: 11, history: 22 }));
for (const field of ['aboutPageId', 'historyPageId']) {
  for (const value of [undefined, '', 0, -1, 1.5, 'abc', '1x', ' 1', '01', '1\n', Number.MAX_SAFE_INTEGER + 1, null, true]) {
    test(`config rejects ${field} ${JSON.stringify(value)} before fetch`, async () => {
      await assert.rejects(fetchPages({ ...options, [field]: value, fetchImpl: () => assert.fail('fetch') }));
    });
  }
}
for (const change of [{ historyPageId: 11 }, { environment: 'live' }, { environment: '' }, { wordpressBaseUrl: '' },
  { wordpressBaseUrl: 'javascript:x' }, { wordpressBaseUrl: 'https://user:pass@cms.example' }, { wordpressBaseUrl: 'https://cms.example?q=1' }]) {
  test(`invalid config fails closed ${JSON.stringify(change)}`, async () => assert.rejects(fetchPages({ ...options, ...change, fetchImpl: () => assert.fail('fetch') })));
}
test('REST uses exact public Page endpoints, no credentials, rejects redirects', async () => {
  const calls = [];
  const pages = await fetchPages({ ...options, fetchImpl: async (url, request) => {
    calls.push(url); assert.equal(request.redirect, 'error'); assert.equal(request.headers.Authorization, undefined);
    return response(raw(Number(new URL(url).pathname.split('/').at(-1))));
  } });
  assert.deepEqual(calls, ['https://cms.example/wp-json/wp/v2/pages/11?context=view', 'https://cms.example/wp-json/wp/v2/pages/22?context=view']);
  assert.deepEqual([...pages.keys()], ['about.html', 'history.html']);
});
for (const status of ['draft', 'private', 'trash', 'future', undefined]) test(`Page ${status} rejected`, () => assert.throws(() => normalizePage({ ...raw(), status }, 11, options.wordpressBaseUrl)));
for (const value of [null, [], {}, raw(99), { ...raw(), content: {} }, raw(11, ''), raw(11, '<script>only script</script>'), { ...raw(), modified: '2026-02-30T00:00:00' }]) {
  test(`invalid Page model ${JSON.stringify(value)}`, () => assert.throws(() => normalizePage(value, 11, options.wordpressBaseUrl)));
}
for (const status of [404, 500]) test(`REST HTTP ${status}`, async () => assert.rejects(fetchPages({ ...options, fetchImpl: async () => ({ ok: false, status }) }), new RegExp('HTTP ' + status)));
test('REST invalid JSON', async () => assert.rejects(fetchPages({ ...options, fetchImpl: async () => ({ ok: true, json: async () => { throw Error('invalid'); } }) }), /invalid JSON/));
test('REST network failure', async () => assert.rejects(fetchPages({ ...options, fetchImpl: async () => { throw Error('offline'); } }), /offline/));
test('timeout includes response body, no retry', async () => {
  let calls = 0;
  await assert.rejects(fetchPages({ ...options, timeoutMs: 10, fetchImpl: async () => { calls++; return { ok: true, json: () => new Promise(() => {}) }; } }), /timed out/);
  assert.equal(calls, 1);
});
test('timeout during fetch', async () => assert.rejects(fetchPages({ ...options, timeoutMs: 10, fetchImpl: () => new Promise(() => {}) }), /timed out/));
for (const html of ['<h1>Heading</h1>', '<H1 class="x">Heading</H1>']) test('H1 fails before News sanitizer can strip it: ' + html, () => assert.throws(() => normalizePage(raw(11, html), 11, options.wordpressBaseUrl), /H1/));
test('shared sanitizer strips active content, unsafe schemes and handlers', () => {
  const html = '<p onclick="bad()">Safe</p><script>bad()</script><iframe>bad</iframe><form>bad</form>' +
    '<a href="javascript:x">A</a><img src="data:image/png;base64,AAAA"><a href="blob:x">B</a>' +
    '<img src="https://images.example/a.jpg" onerror="bad()"><a href="https://cms.example/about">CMS</a>';
  const clean = normalizePage(raw(11, html), 11, options.wordpressBaseUrl).contentHtml;
  assert.doesNotMatch(clean, /script|iframe|form|onclick|onerror|javascript:|data:|blob:|base64|href="https:\/\/cms/);
  assert.match(clean, /<p>Safe<\/p>/); assert.match(clean, /src="https:\/\/images.example/);
});
test('safe editorial markup and inline images retained; no featured image placement', () => {
  const html = '<h2>Two</h2><h3>Three</h3><p>Text</p><ul><li>A</li></ul><ol><li>B</li></ol><figure><img src="http://images.example/a.jpg"><figcaption>Caption</figcaption></figure><a href="https://example.org/" target="_blank">Link</a>';
  const value = normalizePage({ ...raw(11, html), featured_media: 123 }, 11, options.wordpressBaseUrl);
  assert.match(value.contentHtml, /rel="noopener noreferrer"/);
  for (const tag of ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'figure', 'figcaption', 'img']) assert.ok(value.contentHtml.includes('<' + tag));
  assert.equal(value.featuredImage, undefined);
  assert.throws(() => normalizePage(raw(11, '<p>;base64,AAAA</p>'), 11, options.wordpressBaseUrl), /Base64/);
});
for (const [file, template] of templates) test(`${file} managed block only, immutable shell/H1/metadata/includes`, () => {
  const model = normalizePage(raw(), 11, options.wordpressBaseUrl);
  const output = renderPage(file, template, model);
  const block = /<!-- TILLE:WORDPRESS:[A-Z]+:START -->[\s\S]*?<!-- TILLE:WORDPRESS:[A-Z]+:END -->/;
  assert.equal(output.replace(block, ''), template.replace(block, ''));
  assert.equal((output.match(/<h1\b/g) || []).length, 1);
  assert.match(output, new RegExp(`>${file === 'about.html' ? 'About' : 'History'}<\/h1>`));
  assert.doesNotMatch(output, /CMS title|Source: Wikipedia/);
  assert.equal(output, renderPage(file, template, model));
  const start = `<!-- TILLE:WORDPRESS:${file.slice(0,-5).toUpperCase()}:START -->`;
  assert.throws(() => renderPage(file, template.replace(start, ''), model), /marker/);
  assert.throws(() => renderPage(file, template + start, model), /marker/);
  assert.throws(() => renderPage(file, template.replace(':END -->', ':END -->\n<!-- TILLE:WORDPRESS:' + file.slice(0,-5).toUpperCase() + ':END -->'), model), /marker/);
});
test('exact two outputs, no arbitrary output or model', () => {
  const models = new Map([...templates.keys()].map(file => [file, normalizePage(raw(), 11, options.wordpressBaseUrl)]));
  assert.deepEqual([...generatePages(templates, models).keys()], ['about.html', 'history.html']);
  assert.throws(() => generatePages(new Map(), models));
});
for (const file of ['about.html', 'history.html']) test(`${file} centrally GENERATED`, () => {
  assert.equal(classifyContentPath(file).classification, 'GENERATED');
  assert.equal(validateContentChanges({ environment: 'staging', contentRef: 'content/staging', paths: [file] }).valid, true);
});
for (const file of ['contact.html', 'index.html', 'news.html', 'sitemap.xml', 'impressum.html', 'datenschutz.html', 'feedback.html', 'public/site/data/site-navigation.json', 'about.html/x', 'events/a/index.html', 'assets/a.js']) {
  test(`Pages scope rejects ${file}`, () => assert.throws(() => assertPagesScope([file])));
}
