import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import { prepareStagingPages, createPagesCommit } from '../scripts/wordpress-pages/staging-content.mjs';
import { runPagesSync } from '../scripts/wordpress-pages/staging-sync.mjs';
import { fixtureRepo, fixtureBlob, fixtureCommit, fixtureGit } from './helpers/content-bootstrap-fixture.mjs';

const template = name => `<html><h1>${name}</h1><!-- TILLE:WORDPRESS:${name.toUpperCase()}:START -->Fallback<!-- TILLE:WORDPRESS:${name.toUpperCase()}:END --><footer>NEW CODE SHELL</footer></html>`;
const fetchImpl = async url => ({ ok: true, status: 200, json: async () => ({
  id: Number(new URL(url).pathname.split('/').at(-1)), status: 'publish', title: { rendered: 'Fixture' }, content: { rendered: '<p>Editorial fixture</p>' }
}) });
async function fixture(t, overlay = false) {
  const root = await fixtureRepo(); const output = root + '-pages';
  t.after(async () => { await rm(root, { recursive: true, force: true }); await rm(output, { recursive: true, force: true }); });
  const entry = (path, bytes = path) => ({ path, sha: fixtureBlob(root, bytes) });
  const code = fixtureCommit(root, [entry('index.html'), entry('about.html', template('About')), entry('history.html', template('History')), entry('events/obsolete/index.html')]);
  const others = [entry('public/site/data/site-navigation.json', '{"newNavigation":"must survive"}\r\n'),
    entry('public/residents/data/residents.json', '{"unknown":"keep"}'), entry('public/events/data/months/2026-10.json', '{"events":[]}'),
    entry('public/gallery/data/gallery.json', '{"items":[]}'), entry('news/index.html'), entry('sitemap.xml', '<urlset>unchanged</urlset>\r\n'),
    entry('public/residents/media/fixture/photos/test.jpg', Buffer.from([255, 216, 0, 128, 255, 217]))];
  const content = fixtureCommit(root, [...others, ...(overlay ? ['about', 'history'].map(name => entry(`${name}.html`, 'OLD CONTENT SHELL')) : [])]);
  fixtureGit(root, ['update-ref', 'refs/heads/fixture', code.commit]);
  return { root, output, code, content, others, options: { repoRoot: root, output, environment: 'staging', codeSha: code.commit,
    contentSha: content.commit, wordpressBaseUrl: 'https://cms.example', aboutPageId: '11', historyPageId: '22', fetchImpl } };
}
test('Pages-only fallback survives composition before first sync; other generated removal stays active', async t => {
  const f = await fixture(t); const prepared = await prepareStagingPages(f.options);
  assert.equal(prepared.composition.valid, true);
  for (const name of ['About', 'History']) assert.equal(await readFile(`${f.output}/${name.toLowerCase()}.html`, 'utf8'), template(name));
  await assert.rejects(readFile(`${f.output}/events/obsolete/index.html`), { code: 'ENOENT' });
});
test('generator reads changed CODE shell, never the old composed content overlay', async t => {
  const f = await fixture(t, true); const prepared = await prepareStagingPages(f.options);
  assert.equal(await readFile(`${f.output}/about.html`, 'utf8'), 'OLD CONTENT SHELL');
  for (const html of prepared.summary.generatedFiles.values()) {
    assert.match(html, /NEW CODE SHELL/); assert.match(html, /Editorial fixture/); assert(!html.includes('OLD CONTENT SHELL'));
  }
});
test('prepare validates immutable snapshots with no Git object/ref writes', async t => {
  const f = await fixture(t); const before = fixtureGit(f.root, ['count-objects', '-v']); const refs = fixtureGit(f.root, ['show-ref']);
  const prepared = await prepareStagingPages(f.options);
  assert.deepEqual(prepared.summary.changedFiles, ['about.html', 'history.html']);
  assert.equal(prepared.revision.contentSha, f.content.commit);
  assert.deepEqual(fixtureGit(f.root, ['count-objects', '-v']), before); assert.deepEqual(fixtureGit(f.root, ['show-ref']), refs);
});
test('single-parent Pages commit preserves every other blob including fresh navigation, sitemap and binary media', async t => {
  const f = await fixture(t, true); const prepared = await prepareStagingPages(f.options); const sha = createPagesCommit(f.root, prepared);
  assert.equal(fixtureGit(f.root, ['show', '-s', '--format=%P', sha]).toString().trim(), f.content.commit);
  assert.equal(fixtureGit(f.root, ['diff-tree', '--no-commit-id', '--name-only', '-r', f.content.commit, sha]).toString().trim(), 'about.html\nhistory.html');
  for (const file of f.others) assert.equal(fixtureGit(f.root, ['rev-parse', `${sha}:${file.path}`]).toString().trim(), file.sha);
  for (const [file, html] of prepared.summary.generatedFiles) assert.equal(fixtureGit(f.root, ['show', `${sha}:${file}`]).toString(), html);
});
test('identical pages are a no-op with no commit, objects or refs written', async t => {
  const f = await fixture(t); const prepared = await prepareStagingPages(f.options); const sha = createPagesCommit(f.root, prepared);
  const next = await prepareStagingPages({ ...f.options, contentSha: sha, output: f.output + '/next' });
  assert.deepEqual(next.summary.changedFiles, []); assert.equal(next.summary.hasChanges, false);
  const before = fixtureGit(f.root, ['count-objects', '-v']); assert.equal(createPagesCommit(f.root, next), null);
  assert.deepEqual(fixtureGit(f.root, ['count-objects', '-v']), before);
});
test('mismatched diff, incomplete output and unexpected files fail before object writes', async t => {
  const f = await fixture(t); const prepared = await prepareStagingPages(f.options); const before = fixtureGit(f.root, ['count-objects', '-v']);
  for (const change of [{ changedFiles: ['about.html'] }, { hasChanges: false },
    { generatedFiles: new Map([['about.html', '<p>x</p>']]) },
    { generatedFiles: new Map([...prepared.summary.generatedFiles, ['sitemap.xml', 'bad']]) }]) {
    assert.throws(() => createPagesCommit(f.root, { ...prepared, summary: { ...prepared.summary, ...change } }));
    assert.deepEqual(fixtureGit(f.root, ['count-objects', '-v']), before);
  }
});
test('validate-only orchestration never publishes and creates no Git objects', async t => {
  const f = await fixture(t); const before = fixtureGit(f.root, ['count-objects', '-v']);
  const result = await runPagesSync({ ...f.options, mode: 'validate-only', runnerTemp: os.tmpdir(),
    heads: () => ({ codeSha: f.code.commit, contentSha: f.content.commit }), publish: () => assert.fail('publish') });
  assert.equal(result.action, 'validated'); assert.deepEqual(fixtureGit(f.root, ['count-objects', '-v']), before);
});
for (const key of ['codeSha', 'contentSha']) test(`fresh ${key} movement after prepare aborts without publication or retry`, async t => {
  const f = await fixture(t); let reads = 0;
  await assert.rejects(runPagesSync({ ...f.options, mode: 'sync-pr', runnerTemp: os.tmpdir(),
    heads: () => ({ codeSha: f.code.commit, contentSha: f.content.commit, ...(++reads > 1 ? { [key]: 'a'.repeat(40) } : {}) }),
    publish: () => assert.fail('publish') }), /moved/);
  assert.equal(reads, 2);
});
for (const mode of ['validate-only', 'sync-pr']) test(`${mode}: live fails before Git, source fetch or publication`, async () => {
  await assert.rejects(runPagesSync({ mode, environment: 'live', prepare: () => assert.fail('prepare'), fetchImpl: () => assert.fail('fetch') }),
    /Live WordPress publishing is not activated yet\./);
});
