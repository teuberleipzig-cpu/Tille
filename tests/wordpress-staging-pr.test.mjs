import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOwnedPr, verifyPr, createGitHubApi } from '../scripts/news/staging-pr.mjs';
import { publishStagingNews } from '../scripts/news/staging-publish.mjs';
import { REPOSITORY, BRANCH, PR_MARKER } from '../scripts/news/staging-contract.mjs';
const revision = { codeSha: 'a'.repeat(40), contentSha: 'b'.repeat(40), contentRef: 'content/staging' };
const generated = 'c'.repeat(40);
const pr = () => ({ number: 1, state: 'open', draft: true, auto_merge: null, user: { login: 'github-actions[bot]' }, body: PR_MARKER,
  base: { ref: 'content/staging', sha: revision.contentSha, repo: { full_name: REPOSITORY } },
  head: { ref: BRANCH, sha: generated, repo: { full_name: REPOSITORY } }, changed_files: 1 });
const prepared = changes => ({ revision, summary: { hasChanges: changes, articleCount: 1, added: [], updated: [], removed: [] } });
function mock(existing = null) {
  let current = existing; const calls = []; let head = existing?.head.sha || '';
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path.startsWith('git/ref/')) return head ? { object: { sha: head } } : null;
    if (path === 'pulls' && method === 'POST') { current = pr(); current.body = body.body; return current; }
    if (method === 'PATCH') { Object.assign(current, body); return current; }
    if (path === 'pulls/1') return current;
    throw new Error('Unexpected API request');
  };
  api.all = async path => path.endsWith('/files') ? [{ filename: 'news/index.html' }] : current ? [current] : [];
  return { api, calls, push: async (sha, previous) => { assert.equal(previous, head); head = sha; if (current) current.head.sha = sha; calls.push({ method: 'PUSH' }); } };
}
test('PR contract accepts exact owned staging Draft', () => assert.doesNotThrow(() => assertOwnedPr(pr(), revision, generated)));
for (const [name, change] of Object.entries({ ready: { draft: false }, closed: { state: 'closed' }, autoMerge: { auto_merge: {} }, foreign: { user: { login: 'someone' } }, marker: { body: '' } })) {
  test(`PR rejects ${name}`, () => assert.throws(() => assertOwnedPr({ ...pr(), ...change }, revision, generated)));
}
for (const part of ['base', 'head']) test(`PR rejects wrong ${part} ref/repo/SHA`, () => {
  for (const change of [{ ref: 'main' }, { repo: { full_name: 'other/repo' } }, { sha: 'd'.repeat(40) }]) {
    const value = pr(); Object.assign(value[part], change); assert.throws(() => assertOwnedPr(value, revision, generated));
  }
});
test('full paginated changed file list and renamed previous path checked', async () => {
  const value = pr(); value.changed_files = 101;
  let pageCount = 0;
  const api = createGitHubApi('fixture-token', async url => {
    const parsed = new URL(url); let result = value;
    if (parsed.pathname.endsWith('/files')) { pageCount++; result = Array.from({ length: pageCount === 1 ? 100 : 1 }, (_, i) => ({ filename: `news/post-${pageCount}-${i}/index.html` })); }
    return { ok: true, json: async () => result };
  });
  await verifyPr(api, 1, revision, generated); assert.equal(pageCount, 2);
  const fake = async () => pr(); fake.all = async () => [{ filename: 'news/index.html', previous_filename: 'public/residents/data/residents.json' }];
  await assert.rejects(verifyPr(fake, 1, revision, generated), /not allowed/);
});
test('incomplete and oversized PR file listings fail', async () => {
  for (const count of [2, 3001]) {
    const api = async () => ({ ...pr(), changed_files: count }); api.all = async () => [{ filename: 'news/index.html' }];
    await assert.rejects(verifyPr(api, 1, revision, generated));
  }
});
test('changed content creates exactly one Draft PR, content base, no deploy', async () => {
  const m = mock(); let commits = 0;
  const result = await publishStagingNews({ prepared: prepared(true), api: m.api, checkHeads: async () => {}, createCommit: async () => { commits++; return generated; }, push: m.push });
  assert.equal(result.action, 'created-draft'); assert.equal(commits, 1);
  const create = m.calls.find(c => c.method === 'POST'); assert.equal(create.body.base, 'content/staging'); assert.equal(create.body.draft, true); assert.equal(create.body.head, BRANCH);
  assert(!m.calls.some(c => /dispatch|merge/.test(c.path || '')));
});
test('existing own Draft updated with exact lease predecessor', async () => {
  const old = pr(); old.head.sha = 'd'.repeat(40); const m = mock(old);
  const result = await publishStagingNews({ prepared: prepared(true), api: m.api, checkHeads: async () => {}, createCommit: async () => generated, push: m.push });
  assert.equal(result.action, 'updated-draft'); assert(!m.calls.some(c => c.method === 'POST'));
});
test('no-change no PR has zero mutations', async () => {
  const m = mock(); await publishStagingNews({ prepared: prepared(false), api: m.api, checkHeads: async () => {}, createCommit: () => assert.fail('commit'), push: () => assert.fail('push') });
  assert(!m.calls.some(c => c.method !== 'GET'));
});
test('no-change only owned stale Draft closes, no commit/push/comment dependency', async () => {
  const m = mock(pr()); await publishStagingNews({ prepared: prepared(false), api: m.api, checkHeads: async () => {}, createCommit: () => assert.fail('commit'), push: () => assert.fail('push') });
  assert.deepEqual(m.calls.filter(c => c.method !== 'GET'), [{ path: 'pulls/1', method: 'PATCH', body: { state: 'closed' } }]);
});
test('foreign Draft fails without mutation', async () => {
  const value = pr(); value.user.login = 'foreign'; const m = mock(value);
  await assert.rejects(publishStagingNews({ prepared: prepared(false), api: m.api, checkHeads: async () => {} }));
  assert(!m.calls.some(c => c.method !== 'GET'));
});
test('moved head before commit or push aborts without claiming success', async () => {
  const m = mock(); let checks = 0;
  await assert.rejects(publishStagingNews({ prepared: prepared(true), api: m.api, checkHeads: async () => { if (++checks === 2) throw new Error('moved'); }, createCommit: () => assert.fail('commit'), push: () => assert.fail('push') }), /moved/);
});
test('base movement after PR creation fails final verification', async () => {
  const m = mock(); const api = async (...args) => { const result = await m.api(...args); if (args[1] === 'POST') result.base.sha = 'd'.repeat(40); return result; }; api.all = m.api.all;
  await assert.rejects(publishStagingNews({ prepared: prepared(true), api, checkHeads: async () => {}, createCommit: async () => generated, push: m.push }), /base SHA/);
});
test('historical ownership allows a human-reviewed merged PR, never an open ready PR', () => {
  const prior = pr(); prior.state = 'closed'; prior.draft = false;
  assert.doesNotThrow(() => assertOwnedPr(prior, revision, generated, { historical: true }));
  prior.state = 'open'; assert.throws(() => assertOwnedPr(prior, revision, generated, { historical: true }));
});
test('rename without previous filename fails closed', async () => {
  const api = async () => pr(); api.all = async () => [{ filename: 'news/index.html', status: 'renamed' }];
  await assert.rejects(verifyPr(api, 1, revision, generated), /Rename origin/);
});
test('foreign environment automation PR blocks new staging write', async () => {
  const value = pr(); value.head.ref = 'automation/wordpress-news/live'; const m = mock(value);
  await assert.rejects(publishStagingNews({ prepared: prepared(true), api: m.api, checkHeads: async () => {}, createCommit: () => assert.fail('commit') }));
});
