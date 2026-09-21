import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveEnvironment, assertWritable } from '../public/resident-portal/js/core/environment.js';
import { patchResident, selectTarget, draftKey } from '../public/resident-portal/js/core/resident-patch.js';
import { mediaPath } from '../public/resident-portal/js/core/media-scope.js';
import { loginSession } from '../public/resident-portal/js/core/portal-session.js';
import { githubFixture, fixtureData, fixtureResident } from './helpers/portal-github-fixture.mjs';
const environment = resolveEnvironment('www-test.distillery.de');
const identity = { id: 'fixture-resident', invite: 'fixture-invite' };
const mockToken = 'TEST-ONLY-NOT-A-GITHUB-CREDENTIAL';
async function session(mock = githubFixture(), preload = fixtureResident(), code = 'FIXTURE-CODE', token = mockToken) {
  const result = await loginSession(environment, identity, preload, code, token, mock.fetcher);
  result.setViewBaseline(result.resident);
  return result;
}
const writes = mock => mock.calls.filter(c => c.method !== 'GET');
test('host staging mapping has no main default', () => assert.deepEqual(environment, { environment: 'staging', contentRef: 'content/staging' }));
test('live recognized but writes blocked', async () => {
  const live = resolveEnvironment('www.distillery.de');
  assert.equal(live.contentRef, 'content/live');
  assert.throws(() => assertWritable(live), /not activated/);
  await assert.rejects(loginSession(live, identity, fixtureResident(), 'FIXTURE-CODE', mockToken, () => assert.fail('network')), /not activated/);
});
for (const host of ['unknown.test', 'localhost', '127.0.0.1']) test(`${host} has no implicit route`, () => assert.throws(() => resolveEnvironment(host)));
for (const host of ['localhost', '127.0.0.1']) test(`${host} explicit staging`, () => assert.equal(resolveEnvironment(host, '?environment=staging').contentRef, 'content/staging'));
for (const branch of ['main', 'feature/x', 'content/staging', '']) test(`branch override rejected: ${branch}`, () => {
  assert.throws(() => resolveEnvironment('www-test.distillery.de', '?branch=' + encodeURIComponent(branch)), /Legacy/);
});
test('public environment override rejected', () => assert.throws(() => resolveEnvironment('www-test.distillery.de', '?environment=staging')));
test('login uses fresh commit and validates public invite/code', async () => {
  const mock = githubFixture(); const current = await session(mock);
  assert.equal(current.context.id, identity.id);
  assert(mock.calls.some(c => c.url.endsWith('?ref=' + current.getContentSha())));
  assert.equal(writes(mock).length, 0);
});
test('login blob fallback stays bound to snapshot', async () => { const mock = githubFixture(); mock.controls.blobFallback = true; await session(mock); assert(mock.calls.some(c => c.url.includes('/git/blobs/'))); });
for (const field of ['inviteId', 'code', 'enabled']) test(`fresh changed ${field} aborts login`, async () => {
  const data = fixtureData(); data.residents[0].portal[field] = field === 'enabled' ? false : 'changed';
  const mock = githubFixture(data); await assert.rejects(session(mock)); assert.equal(writes(mock).length, 0);
});
test('wrong code aborts login', async () => { const mock = githubFixture(); await assert.rejects(session(mock, fixtureResident(), 'wrong'), /Code falsch/); assert.equal(writes(mock).length, 0); });
test('invite/code without token cannot write or read GitHub', async () => { const mock = githubFixture(); await assert.rejects(session(mock, fixtureResident(), 'FIXTURE-CODE', ''), /leer/); assert.equal(mock.calls.length, 0); });
test('no fallback from foreign invite to resident id', () => assert.throws(() => selectTarget(fixtureData(), { ...identity, invite: 'foreign' })));
test('duplicate ids rejected', () => { const data = fixtureData(); data.residents.push({ ...data.residents[0], portal: { ...data.residents[0].portal, inviteId: 'other' } }); assert.throws(() => selectTarget(data, identity)); });
test('patch preserves other residents access unknowns and untouched normalized fields', () => {
  const data = fixtureData(); const raw = structuredClone(data.residents[0]);
  const view = { ...structuredClone(raw), genre: '' }; const edited = { ...view, city: 'Berlin' };
  data.residents[0].futureField.additional = true;
  const result = patchResident(data, identity, raw, view, edited);
  assert.equal(result.residents[0].city, 'Berlin'); assert(!Object.hasOwn(result.residents[0], 'genre'));
  assert.deepEqual(result.residents[0].portal, raw.portal); assert.deepEqual(result.residents[0].futureField, data.residents[0].futureField);
  assert.equal(JSON.stringify(result.residents[1]), JSON.stringify(data.residents[1]));
});
test('same-field concurrent patch conflict', () => { const data = fixtureData(); const raw = structuredClone(data.residents[0]); data.residents[0].city = 'Remote'; assert.throws(() => patchResident(data, identity, raw, raw, { ...raw, city: 'Local' }), /Konflikt/); });
for (const change of [{ id: 'other' }, { portal: {} }, { futureField: {} }, { bio: 'data:text/html,test' }]) test(`guard rejects ${Object.keys(change)[0]}`, () => {
  const data = fixtureData(); const raw = data.residents[0]; assert.throws(() => patchResident(data, identity, raw, raw, { ...raw, ...change }));
});
test('fresh save single resident atomic nonforce commit plus dual SHA dispatch', async () => {
  const mock = githubFixture(); const current = await session(mock); const parent = current.getContentSha();
  const result = await current.save({ ...current.resident, city: 'Berlin' });
  assert.equal(mock.data().residents[0].city, 'Berlin'); assert.deepEqual(mock.data().residents[1], fixtureData().residents[1]);
  assert.deepEqual(mock.calls.find(c => c.method === 'POST' && c.url.endsWith('/git/commits')).body.parents, [parent]);
  assert.equal(mock.calls.find(c => c.method === 'PATCH').body.force, false);
  const dispatch = mock.calls.find(c => c.url.endsWith('/dispatches')).body;
  assert.deepEqual(dispatch, { ref: 'main', inputs: { expected_sha: mock.main(), expected_content_sha: result.contentSha } });
  assert.equal(current.getContentSha(), mock.head());
  assert(!JSON.stringify(mock.calls).includes(mockToken));
  assert(!JSON.stringify(mock.data()).includes(mockToken));
});
test('no-op saves do not commit or dispatch', async () => { const mock = githubFixture(); const current = await session(mock); assert.equal((await current.save(current.resident)).changed, false); assert.equal(writes(mock).length, 0); });
test('token in edited content rejected', async () => { const mock = githubFixture(); const current = await session(mock); await assert.rejects(current.save({ ...current.resident, bio: mockToken }), /Token/); assert.equal(writes(mock).length, 0); });
test('foreign head fails with no stale retry', async () => { const mock = githubFixture(); const current = await session(mock); mock.move(); await assert.rejects(current.save({ ...current.resident, city: 'Berlin' }), /Staging wurde verändert/); await assert.rejects(current.save(current.resident), /neu geladen/); assert.equal(writes(mock).length, 0); });
for (const race of ['moveBeforePatch', 'moveAfterPatch']) test(`atomic ref race ${race} fails closed`, async () => {
  const mock = githubFixture(); const current = await session(mock); mock.controls[race] = true;
  await assert.rejects(current.save({ ...current.resident, city: 'Berlin' }), /Ref-Ergebnis/);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
  assert(!mock.calls.some(c => c.url.endsWith('/dispatches')));
});
for (const path of ['photos/test.jpg', 'presskit/test.pdf', 'presskit/test.zip', 'releases/test.jpg']) test(`media ${path} followed by JSON uses advanced parent`, async () => {
  const mock = githubFixture(); const current = await session(mock);
  const pathFull = 'public/residents/media/fixture-resident/' + path;
  await current.media(pathFull, btoa('synthetic binary')); const afterMedia = current.getContentSha();
  await current.save({ ...current.resident, presskitUrl: '/' + pathFull.replace('public/', '') });
  const commits = mock.calls.filter(c => c.method === 'POST' && c.url.endsWith('/git/commits'));
  assert.equal(commits[1].body.parents[0], afterMedia); assert(mock.files().includes(pathFull));
});
for (const path of ['../other/photos/x.jpg', 'photos/x.svg', 'photos/x.html', 'photos/x.js', 'photos/x.png', 'photos/../x.jpg', 'photos/a\\b.jpg', 'photos/x.jpg?x', 'photos/%2e.jpg']) test(`reject media ${path}`, () => assert.throws(() => mediaPath('public/residents/media/fixture-resident/' + path, identity.id)));
test('reject foreign resident and remote URL', () => {
  assert.throws(() => mediaPath('public/residents/media/other/photos/x.jpg', identity.id));
  assert.throws(() => mediaPath('https://evil.test/residents/media/fixture-resident/photos/x.jpg', identity.id));
});
test('delete checks fresh file and advances commit parent; 404 is no-op', async () => {
  const mock = githubFixture(); const current = await session(mock); const path = 'public/residents/media/fixture-resident/photos/x.jpg';
  await current.media(path, btoa('synthetic')); const parent = current.getContentSha();
  await current.media(path, null); assert.notEqual(current.getContentSha(), parent); assert(!mock.files().includes(path));
  const count = writes(mock).length; await current.media(path, null); assert.equal(writes(mock).length, count);
  await current.save({ ...current.resident, city: 'Berlin' });
  assert.equal(mock.calls.filter(c => c.method === 'POST' && c.url.endsWith('/git/commits')).length, 3);
});
test('media success JSON conflict reports partial without cleanup retry', async () => {
  const mock = githubFixture(); const current = await session(mock);
  await current.media('public/residents/media/fixture-resident/releases/cover.jpg', btoa('fixture'));
  mock.move(); await assert.rejects(current.save({ ...current.resident, city: 'Berlin' }), /Medium wurde gespeichert.*keine automatische Bereinigung/);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
});
test('Actions403 preserves successful content no rollback or repeat save', async () => {
  const mock = githubFixture(); const current = await session(mock); mock.controls.dispatch403 = true;
  const result = await current.save({ ...current.resident, city: 'Berlin' });
  assert.match(result.message, /Content gespeichert.*konnte nicht gestartet/);
  assert.equal(mock.data().residents[0].city, 'Berlin'); assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
  assert.equal(mock.calls.filter(c => c.url.endsWith('/dispatches')).length, 1);
});
test('draft key separates environment and resident, legacy not restored', () => {
  assert.equal(draftKey(environment, identity.id), 'residentPortalDraft:staging:fixture-resident');
  const save = readFileSync(new URL('../public/resident-portal/js/modules/save.js', import.meta.url), 'utf8');
  assert(!save.includes('getItem')); assert(!save.includes('removeItem'));
});
test('UI news retains unknown properties and release tracks are not flattened', () => {
  const news = readFileSync(new URL('../public/resident-portal/js/modules/news.js', import.meta.url), 'utf8');
  const releases = readFileSync(new URL('../public/resident-portal/js/modules/releases.js', import.meta.url), 'utf8');
  assert.match(news, /\.\.\.item/); assert.match(news, /document.activeElement/);
  assert.match(releases, /remaining.splice\(index, 1\)\[0\]/); assert.match(releases, /document.activeElement/);
});
test('all profile and link intents accepted without access mutation', () => {
  const data = fixtureData(); const raw = data.residents[0];
  const change = { name: 'Changed', city: 'City', genre: 'House', labels: ['Label'], relatedProjects: ['Project'],
    bio: 'Bio', instagramUrl: 'https://example.com', soundcloudUrl: '', raUrl: '', discogsUrl: '', bandcampUrl: '', bookingEmail: 'fixture@example.com' };
  const next = patchResident(data, identity, raw, raw, { ...raw, ...change });
  for (const [key, value] of Object.entries(change)) assert.deepEqual(next.residents[0][key], value);
  assert.deepEqual(next.residents[0].portal, raw.portal);
});
test('session context does not reread mutable selector or environment', async () => {
  const env = { ...environment }; const selector = { ...identity }; const mock = githubFixture();
  const current = await loginSession(env, selector, fixtureResident(), 'FIXTURE-CODE', mockToken, mock.fetcher);
  current.setViewBaseline(current.resident); env.contentRef = 'main'; selector.id = 'other';
  await current.save({ ...current.resident, city: 'Berlin' });
  assert.equal(current.context.contentRef, 'content/staging'); assert.equal(current.context.id, identity.id);
  assert(mock.calls.filter(c => c.method === 'PATCH').every(c => c.url.endsWith('/content/staging')));
});
test('disabled access is also guarded by patch not only login', () => {
  const data = fixtureData(); const raw = structuredClone(data.residents[0]); data.residents[0].portal.enabled = false;
  assert.throws(() => patchResident(data, identity, raw, raw, { ...raw, city: 'Berlin' }), /deaktiviert/);
});
test('colliding resident media slugs fail before any write', async () => {
  const data = fixtureData(); data.residents.push({ id: 'Fixture Resident' });
  const mock = githubFixture(data); const current = await session(mock);
  await assert.rejects(current.media('public/residents/media/fixture-resident/photos/x.jpg', btoa('fixture')), /nicht eindeutig/);
  assert.equal(writes(mock).length, 0);
});
test('media-only mutation can complete deployment without unnecessary JSON rewrite', async () => {
  const mock = githubFixture(); const current = await session(mock);
  await current.media('public/residents/media/fixture-resident/photos/x.jpg', btoa('fixture'));
  assert(mock.calls.some(c => c.url.endsWith('/git/ref/heads/main')));
  assert(!mock.calls.some(c => c.url.endsWith('/dispatches')));
  await current.save(current.resident);
  assert.equal(mock.calls.filter(c => c.method === 'PATCH').length, 1);
  assert.equal(mock.calls.filter(c => c.url.endsWith('/dispatches')).length, 1);
});
test('active module graph has versioned changed imports and no legacy writer', () => {
  const root = new URL('../public/resident-portal/', import.meta.url);
  const html = readFileSync(new URL('index.html', root), 'utf8');
  assert.match(html, /app-coverfix.js\?v=staging-writer-1/);
  const visited = new Set();
  function visit(relative) {
    const url = new URL(relative, root); if (visited.has(url.pathname)) return; visited.add(url.pathname);
    const source = readFileSync(url, 'utf8');
    assert(!/CONFIG\.branch|hasExplicitBranchParam|setInterval|MutationObserver/.test(source));
    assert(!/method:\s*['"](?:PUT|DELETE)['"]/.test(source));
    for (const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) {
      const target = new URL(match[1], url);
      if (!['dom.js', 'state.js', 'profile.js', 'links.js', 'image-processing.js'].includes(target.pathname.split('/').pop())) {
        assert.equal(target.search, '?v=staging-writer-1');
      }
      visit(target.href);
    }
  }
  visit('js/app-coverfix.js?v=staging-writer-1'); assert(visited.size >= 16);
});
