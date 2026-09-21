import assert from 'node:assert/strict';
import test from 'node:test';
import { createStagingOperation } from '../public/admin/js/core/staging-operation.js';
import { settings, assertScope, RESIDENT_PATH, NAVIGATION_PATH, GALLERY_PATH } from '../public/admin/js/core/staging-contract.js';
import { resolveEnvironment } from '../scripts/content/environments.mjs';
import { CONTENT_MANIFEST } from '../scripts/content/content-manifest.mjs';
import { githubMock, config, CODE, CONTENT, NEXT_CODE } from './helpers/admin-staging-github.mjs';
import { saveGalleryData } from '../public/admin/js/features/gallery/gallery-save.js';

const operation = (mock, scope = 'resident', subject) => createStagingOperation(config(), { scope, subject, fetch: mock.fetch });
const mutations = mock => mock.calls.filter(c => c.method !== 'GET');
test('explicit staging agrees with server environment contract', () => assert.equal(settings(config()).contentRef, resolveEnvironment('staging').contentRef));
for (const overrides of [{ environment: '' }, { environment: 'live' }, { environment: 'main' }, { contentRef: '' }, { contentRef: 'main' }, { contentRef: 'feature/x' }, { branch: 'main' }, { owner: 'foreign' }]) {
  test(`fail closed ${JSON.stringify(overrides)}`, () => assert.throws(() => settings({ ...config(), ...overrides })));
}
const scopes = [
  ['resident', null, RESIDENT_PATH], ['navigation', null, NAVIGATION_PATH], ['gallery', null, GALLERY_PATH],
  ['gallery', null, 'public/gallery/media/fixture/a.jpg'], ['resident-media', 'fixture', 'public/residents/media/fixture/photos/a.jpg'],
  ['resident-media', 'fixture', 'public/residents/media/fixture/releases/a.jpg'], ['resident-media', 'fixture', 'public/residents/media/fixture/presskit/a.pdf'],
  ['event-media', 'fixture', 'public/events/media/fixture/a.jpg'], ['event', 'fixture', 'events/fixture/index.html'],
  ['event', 'fixture', 'sitemap.xml'], ['event', 'fixture', 'public/events/data/months/2026-09.json'],
  ...['meta','manifest','event-index','search-index'].map(name => ['event','fixture',`public/events/data/${name}.json`])
];
test('every allowed Admin path is a server content-manifest path', () => {
  for (const [scope, subject, file] of scopes) {
    assertScope(scope, subject, [file]);
    assert.ok(CONTENT_MANIFEST.rules.some(r => r.classification !== 'CODE' && (r.exact === file || (r.tree && r.pattern && new RegExp('^' + r.tree + r.pattern + '$').test(file)))), file);
  }
});
test('scopes reject traversal, foreign resident, event and code paths', () => {
  for (const path of ['../x', 'public\\residents\\x', '/absolute', 'public/residents/media/other/photos/x.jpg', RESIDENT_PATH, 'scripts/x.js']) assert.throws(() => assertScope('resident-media', 'fixture', [path]));
  assert.throws(() => assertScope('event', 'fixture', ['events/other/index.html']));
  assert.throws(() => assertScope('navigation', '', [GALLERY_PATH]));
});
test('operation captures settings/token once and reads contents by exact commit SHA', async () => {
  const mock = githubMock({ [RESIDENT_PATH]: '{}' }), input = config();
  const op = createStagingOperation(input, { scope: 'resident', fetch: mock.fetch });
  input.contentRef = 'main'; input.token = 'changed'; input.environment = 'live';
  const first = await op.bind(); await op.bind(); await op.getTextFile(RESIDENT_PATH);
  assert.ok(Object.isFrozen(first)); assert.equal(first.contentSha, CONTENT); assert.equal(first.codeSha, CODE);
  assert.equal(mock.calls.filter(c => c.path === '/git/ref/heads/main').length, 1);
  assert.match(mock.calls.at(-1).path, new RegExp('ref=' + CONTENT + '$'));
  assert.ok(mock.calls.every(c => c.authorization === 'Bearer fixture-token'));
});
test('missing content SHA blocks without mutation', async () => {
  const mock = githubMock(); mock.content = '';
  await assert.rejects(operation(mock).bind(), /SHA/); assert.equal(mutations(mock).length, 0);
});
test('missing token can read but cannot mutate staging', async () => {
  const mock = githubMock({ [RESIDENT_PATH]: '{}' });
  const op = createStagingOperation({ ...config(), token: '' }, { scope: 'resident', fetch: mock.fetch });
  await op.getTextFile(RESIDENT_PATH);
  await assert.rejects(op.commitFiles({ files: new Map([[RESIDENT_PATH, 'new']]), expectedHead: CONTENT }), /Token/);
  assert.equal(mutations(mock).length, 0);
});
test('large-file blob fallback uses the blob from the bound snapshot, not a branch/raw URL', async () => {
  const mock = githubMock({ [RESIDENT_PATH]: '{"fixture":true}' });
  const fileSha = mock.trees.get(mock.commits.get(CONTENT).tree.sha)[RESIDENT_PATH];
  mock.before = c => c.path.startsWith('/contents/') ? { ok: true, json: async () => ({ sha: fileSha, encoding: 'none', content: '' }) } : undefined;
  assert.equal((await operation(mock).getTextFile(RESIDENT_PATH)).text, '{"fixture":true}');
  assert.equal(mock.calls.at(-1).path, '/git/blobs/' + fileSha);
});
test('navigation writes exactly its JSON path in one staging commit', async () => {
  const mock = githubMock({ [NAVIGATION_PATH]: '{}' }), op = operation(mock, 'navigation');
  const file = await op.getTextFile(NAVIGATION_PATH);
  await op.putTextFile(NAVIGATION_PATH, '{"fixture":true}', file.sha);
  assert.deepEqual(mock.calls.find(c => c.path === '/git/trees' && c.method === 'POST').body.tree.map(e => e.path), [NAVIGATION_PATH]);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
});
test('stale operation aborts before write with no retry', async () => {
  const mock = githubMock({ [RESIDENT_PATH]: '{}' }), op = operation(mock); await op.bind(); mock.content = NEXT_CODE;
  await assert.rejects(op.commitFiles({ files: new Map([[RESIDENT_PATH, 'new']]), expectedHead: CONTENT }), /Konflikt/);
  assert.equal(mutations(mock).length, 0);
});
test('fresh blob conflict cannot be retried with stale payload', async () => {
  const mock = githubMock({ [RESIDENT_PATH]: '{}' });
  await assert.rejects(operation(mock).putTextFile(RESIDENT_PATH, 'new', 'old'), /Dateikonflikt/);
  assert.equal(mutations(mock).length, 0);
});
test('all event artifacts use one commit, exact parent and one non-force ref update', async () => {
  const mock = githubMock(), op = operation(mock, 'event', 'fixture');
  const files = new Map([['public/events/data/months/2026-09.json', '{}'], ['events/fixture/index.html', '<p>fixture</p>'], ['sitemap.xml', '<xml/>']]);
  const saved = await op.commitFiles({ files, expectedHead: CONTENT, message: 'fixture' });
  assert.equal(mock.calls.filter(c => c.path === '/git/commits' && c.method === 'POST').length, 1);
  assert.deepEqual(mock.commits.get(saved.commit).parents, [{ sha: CONTENT }]);
  assert.deepEqual(mock.calls.filter(c => c.method === 'PATCH').map(c => c.body), [{ sha: saved.commit, force: false }]);
  for (const [path, text] of files) assert.equal(mock.text(path), text);
});
test('wrong commit parent is blocked before ref update', async () => {
  const mock = githubMock(); mock.badParent = true;
  await assert.rejects(operation(mock).commitFiles({ files: new Map([[RESIDENT_PATH, '{}']]), expectedHead: CONTENT }), /Parent/);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 0);
});
test('content movement before ref update aborts without force or retry', async () => {
  const mock = githubMock(); mock.before = c => { if (c.path === '/git/commits' && c.method === 'POST') mock.content = NEXT_CODE; };
  await assert.rejects(operation(mock).commitFiles({ files: new Map([[RESIDENT_PATH, '{}']]), expectedHead: CONTENT }), /Konflikt/);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 0);
});
test('post-write head movement reports saved content and prevents dispatch', async () => {
  const mock = githubMock(); let updated = false;
  mock.before = c => { if (updated && c.path === '/git/ref/heads/content%2Fstaging') mock.content = NEXT_CODE; if (c.method === 'PATCH') updated = true; };
  await assert.rejects(operation(mock).commitFiles({ files: new Map([[RESIDENT_PATH, '{}']]), expectedHead: CONTENT }), e => e.contentSaved === true);
  assert.equal(mock.calls.filter(c => c.path.includes('dispatches')).length, 0);
});
test('dual-SHA dispatch uses fresh main and verified new content commit', async () => {
  const mock = githubMock(), op = operation(mock);
  const saved = await op.commitFiles({ files: new Map([[RESIDENT_PATH, '{}']]), expectedHead: CONTENT });
  mock.code = NEXT_CODE;
  const outcome = await op.finish({ dispatch: true });
  assert.equal(outcome.status, 'dispatched');
  assert.deepEqual(mock.calls.at(-1).body, { ref: 'main', inputs: { expected_sha: NEXT_CODE, expected_content_sha: saved.commit } });
});
test('dispatch permissions failure preserves saved content, no rollback or retry', async () => {
  const mock = githubMock(), op = operation(mock); mock.dispatchFailure = true;
  const saved = await op.commitFiles({ files: new Map([[RESIDENT_PATH, '{}']]), expectedHead: CONTENT });
  assert.equal((await op.finish({ dispatch: true })).status, 'deploy-failed');
  assert.equal(mock.content, saved.commit); assert.equal(mock.calls.filter(c => c.path.includes('dispatches')).length, 1);
});
test('media operations explicitly chain new parents and reject foreign scope', async () => {
  const mock = githubMock(), op = operation(mock, 'resident-media', 'fixture');
  const path = 'public/residents/media/fixture/photos/a.jpg';
  const uploaded = await op.putBase64File(path, Buffer.from('fixture').toString('base64'), '', 'fixture');
  await op.deleteFile(path, uploaded.content.sha, 'fixture delete');
  assert.deepEqual(mock.commits.get(mock.content).parents, [{ sha: uploaded.commit.sha }]);
  assert.equal(mock.text(path), undefined);
  await assert.rejects(op.putBase64File('public/residents/media/other/photos/a.jpg', '', ''), /außerhalb/);
});
test('gallery saves JSON before deleting media, using next commit as parent', async () => {
  const media = 'public/gallery/media/fixture/a.jpg', mock = githubMock({ [GALLERY_PATH]: '{"playlists":[]}', [media]: 'fixture' }), op = operation(mock, 'gallery');
  const file = await op.getTextFile(GALLERY_PATH), queue = new Set([media]);
  const result = await saveGalleryData({ client: op, dataPath: GALLERY_PATH, next: { playlists: [], version: 1 }, loadedSha: file.sha, pendingMediaDeletes: queue });
  assert.equal(result.cleanupFailures.length, 0); assert.equal(queue.size, 0);
  const patches = mock.calls.filter(c => c.method === 'PATCH'); assert.equal(patches.length, 2);
  assert.deepEqual(mock.commits.get(patches[1].body.sha).parents, [{ sha: patches[0].body.sha }]);
});
