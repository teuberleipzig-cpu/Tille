import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { stagingEnvironment, stagingRevision, assertNewsScope, assertSharedSitemap } from '../scripts/news/staging-contract.mjs';
import { prepareStagingNews, createNewsCommit } from '../scripts/news/staging-content.mjs';
import { runStagingSync, assertHeads } from '../scripts/news/staging-sync.mjs';
import { fixtureRepo, fixtureBlob, fixtureCommit, fixtureGit } from './helpers/content-bootstrap-fixture.mjs';
const posts = JSON.parse(await readFile(new URL('fixtures/wordpress-posts.json', import.meta.url), 'utf8'));
const mockFetch = async () => ({ ok: true, status: 200, headers: { get: () => '1' }, json: async () => posts });
const xml = marker => `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://www.distillery.de/news/</loc></url>\n  <url><loc>https://www.distillery.de/news/obsolete/</loc></url>\n  <url><loc>https://www.distillery.de/events/${marker}/</loc><lastmod>2026-01-01</lastmod></url>\n  <url><loc>https://www.distillery.de/residents/${marker}/</loc></url>\n</urlset>`;
async function fixture(t) {
  const root = await fixtureRepo(); const output = root + '-news';
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(output, { recursive: true, force: true }); });
  const entry = (path, content = path) => ({ path, sha: fixtureBlob(root, content) });
  const code = fixtureCommit(root, [entry('index.html'), entry('sitemap.xml', xml('main-only')), entry('news/code-only/index.html')]);
  const others = [entry('public/residents/data/residents.json', '{"unknown":"keep"}\r\n'), entry('events/staging-only/index.html'),
    entry('public/residents/media/fixture/photos/test.jpg', Buffer.from([255, 216, 0, 128, 255, 217]))];
  const content = fixtureCommit(root, [entry('sitemap.xml', xml('staging-only')), entry('news.html'), entry('news/index.html'), entry('news/obsolete/index.html'), ...others]);
  fixtureGit(root, ['update-ref', 'refs/heads/fixture', code.commit]);
  return { root, output, code, content, others, options: { repoRoot: root, output, environment: 'staging',
    codeSha: code.commit, contentSha: content.commit, wordpressBaseUrl: 'https://cms.example', fetchImpl: mockFetch } };
}
for (const value of [undefined, '', 'other', 'STAGING']) test(`invalid environment ${value} fails`, () => assert.throws(() => stagingEnvironment(value)));
test('live fails explicitly', () => assert.throws(() => stagingEnvironment('live'), /Live WordPress publishing is not activated yet\./));
test('staging reuses central environment', () => assert.equal(stagingEnvironment('staging').contentRef, 'content/staging'));
for (const sha of ['main', 'content/staging', 'abc', 'A'.repeat(40)]) test(`non-full SHA ${sha} fails`, () => assert.throws(() => stagingRevision({ environment: 'staging', codeSha: sha, contentSha: 'a'.repeat(40) })));
for (const path of ['news.html', 'news/index.html', 'news/safe-slug/index.html', 'sitemap.xml']) test(`scope permits ${path}`, () => assert.doesNotThrow(() => assertNewsScope([path])));
for (const path of ['index.html', 'scripts/news/x.mjs', '.github/workflows/a.yml', 'docs/a.md', 'docker/Dockerfile', 'unknown.dat', 'events/id/index.html', 'public/residents/data/residents.json', 'news\\x\\index.html']) test(`scope rejects ${path}`, () => assert.throws(() => assertNewsScope([path])));
test('composes exact snapshots; shared sitemap only from staging; validation writes no Git objects/refs', async t => {
  const f = await fixture(t);
  const before = fixtureGit(f.root, ['count-objects', '-v']).toString();
  const refs = fixtureGit(f.root, ['show-ref']).toString();
  const prepared = await prepareStagingNews(f.options);
  assert.equal(prepared.revision.codeSha, f.code.commit); assert.equal(prepared.revision.contentSha, f.content.commit);
  assert.equal(prepared.composition.valid, true);
  const sitemap = prepared.summary.generatedFiles.get('sitemap.xml');
  assert(sitemap.includes('/events/staging-only/')); assert(sitemap.includes('/residents/staging-only/'));
  assert(!sitemap.includes('main-only')); assert(!sitemap.includes('/news/obsolete/'));
  assertSharedSitemap(xml('staging-only'), sitemap);
  assert.equal(fixtureGit(f.root, ['count-objects', '-v']).toString(), before);
  assert.equal(fixtureGit(f.root, ['show-ref']).toString(), refs);
  assert.equal(await readFile(f.output + '/sitemap.xml', 'utf8'), xml('staging-only'));
});
test('content-only single-parent commit adds articles deletes old and preserves other blobs exactly', async t => {
  const f = await fixture(t); const prepared = await prepareStagingNews(f.options); const sha = createNewsCommit(f.root, prepared);
  assert.equal(fixtureGit(f.root, ['show', '-s', '--format=%P', sha]).toString().trim(), f.content.commit);
  const names = fixtureGit(f.root, ['ls-tree', '-r', '--name-only', sha]).toString();
  assert(!names.includes('obsolete')); assert(!names.includes('code-only')); assert(!names.includes('scripts/'));
  assert.equal(prepared.summary.slugs.length, 3);
  for (const slug of prepared.summary.slugs) assert(names.includes(`news/${slug}/index.html`));
  for (const file of f.others) assert.equal(fixtureGit(f.root, ['rev-parse', `${sha}:${file.path}`]).toString().trim(), file.sha);
  const sitemap = fixtureGit(f.root, ['show', `${sha}:sitemap.xml`]).toString(); assertSharedSitemap(xml('staging-only'), sitemap);
});
test('no-change commit performs no object writes', async t => {
  const f = await fixture(t); const before = fixtureGit(f.root, ['count-objects', '-v']).toString();
  assert.equal(createNewsCommit(f.root, { revision: stagingRevision(f.options), summary: { hasChanges: false } }), null);
  assert.equal(fixtureGit(f.root, ['count-objects', '-v']).toString(), before);
});
test('validate-only orchestrator does not invoke publication', async t => {
  const f = await fixture(t); const before = fixtureGit(f.root, ['count-objects', '-v']).toString();
  const result = await runStagingSync({ ...f.options, mode: 'validate-only', runnerTemp: os.tmpdir(),
    heads: () => ({ codeSha: f.code.commit, contentSha: f.content.commit }), publish: () => assert.fail('publish') });
  assert.equal(result.action, 'validated'); assert.equal(fixtureGit(f.root, ['count-objects', '-v']).toString(), before);
});
for (const mode of ['validate-only', 'sync-pr']) test(`${mode} live/empty environment fails before compose/REST/PR`, async () => {
  for (const environment of ['live', undefined]) await assert.rejects(runStagingSync({ mode, environment, prepare: () => assert.fail('compose') }));
});
test('head gates reject movement of either code or content', () => {
  const bound = { codeSha: 'a'.repeat(40), contentSha: 'b'.repeat(40) };
  for (const change of [{ codeSha: 'c'.repeat(40) }, { contentSha: 'c'.repeat(40) }]) assert.throws(() => assertHeads(bound, { ...bound, ...change }), /moved/);
});
test('non-news sitemap blocks cannot be replaced by main or live', () => {
  for (const marker of ['main', 'live']) assert.throws(() => assertSharedSitemap(xml('staging'), xml(marker)), /non-News/);
});
test('entry requires main workflow code and known repository', async () => {
  const runner = await readFile(new URL('../scripts/news/staging-sync.mjs', import.meta.url), 'utf8');
  const workflow = (await readFile(new URL('../.github/workflows/wordpress-news-sync.yml', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  assert.match(runner, /GITHUB_REF !== 'refs\/heads\/main'/); assert.match(runner, /GITHUB_REPOSITORY !== REPOSITORY/);
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/); assert(!workflow.includes('ref: content/staging'));
  assert(!workflow.includes('default:')); assert.match(workflow, /environment:[\s\S]*required: true/);
  assert(!/actions: write|packages: write|workflow run|docker-publish/.test(workflow));
});
