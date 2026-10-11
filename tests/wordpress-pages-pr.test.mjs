import test from 'node:test';
import assert from 'node:assert/strict';
import { assertOwnedPr, verifyPr, findOwnedPr } from '../scripts/wordpress-pages/staging-pr.mjs';
import { publishStagingPages } from '../scripts/wordpress-pages/staging-publish.mjs';
import { createGitHubApi } from '../scripts/news/staging-pr.mjs';
import { assertHeads } from '../scripts/news/staging-sync.mjs';
import { REPOSITORY, BRANCH, PR_MARKER } from '../scripts/wordpress-pages/contract.mjs';
const revision = { codeSha: 'a'.repeat(40), contentSha: 'b'.repeat(40), contentRef: 'content/staging' };
const generated = 'c'.repeat(40);
const pr = () => ({ number: 1, state: 'open', draft: true, auto_merge: null, user: { login: 'github-actions[bot]' }, body: PR_MARKER,
  base: { ref: 'content/staging', sha: revision.contentSha, repo: { full_name: REPOSITORY } },
  head: { ref: BRANCH, sha: generated, repo: { full_name: REPOSITORY } }, changed_files: 1 });
const prepared = hasChanges => ({ revision, summary: { hasChanges } });
function mock(existing = null, orphan = '') {
  let current = existing; const calls = []; let head = existing?.head.sha || orphan;
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path.startsWith('git/ref/')) return head ? { object: { sha: head } } : null;
    if (path === 'pulls' && method === 'POST') { current = pr(); current.body = body.body; return current; }
    if (method === 'PATCH') { Object.assign(current, body); return current; }
    if (path === 'pulls/1') return current;
    throw new Error('Unexpected API request');
  };
  api.all = async path => path.endsWith('/files') ? [{ filename: 'about.html', status: 'modified' }]
    : path.includes('state=closed') ? [] : current ? [current] : [];
  return { api, calls, push: async (sha, previous) => {
    assert.equal(previous, head); head = sha; if (current) current.head.sha = sha; calls.push({ method: 'PUSH' });
  } };
}
const options = (m, changes = true) => ({ prepared: prepared(changes), api: m.api, checkHeads: async () => {},
  createCommit: async () => generated, push: m.push });
test('exact owned Pages Draft accepted', () => assert.doesNotThrow(() => assertOwnedPr(pr(), revision, generated)));
for (const [name, value] of Object.entries({ draft: false, state: 'closed', auto_merge: {}, user: { login: 'someone' }, body: '' })) {
  test(`unowned ${name} rejected before mutation`, async () => {
    const m = mock({ ...pr(), [name]: value }); await assert.rejects(publishStagingPages(options(m)));
    assert(!m.calls.some(c => c.method !== 'GET'));
  });
}
for (const part of ['base', 'head']) for (const field of ['ref', 'repo', 'sha']) test(`wrong ${part}.${field} rejected`, () => {
  const p = pr(); p[part][field] = field === 'repo' ? { full_name: 'foreign/repo' } : field === 'sha' ? 'd'.repeat(40) : 'main';
  assert.throws(() => assertOwnedPr(p, revision, generated));
});
for (const files of [[], [{ filename: 'sitemap.xml', status: 'modified' }], [{ filename: 'about.html', status: 'removed' }],
  [{ filename: 'about.html', status: 'renamed' }], [{ filename: 'about.html', status: 'modified', previous_filename: 'index.html' }]]) {
  test(`reject incomplete/foreign/deleted/renamed file list ${JSON.stringify(files)}`, async () => {
    const api = async () => pr(); api.all = async () => files; await assert.rejects(verifyPr(api, 1, revision, generated));
  });
}
test('duplicate and oversized changed file lists rejected', async () => {
  for (const count of [2, 3, -1]) {
    const api = async () => ({ ...pr(), changed_files: count }); api.all = async () => Array(2).fill({ filename: 'about.html', status: 'modified' });
    await assert.rejects(verifyPr(api, 1, revision, generated));
  }
});
test('shared API pagination reads later PR pages; Pages ownership then uses complete files endpoint', async () => {
  const pages = []; const api = createGitHubApi('fixture-token', async url => {
    const u = new URL(url); let result;
    if (u.pathname.endsWith('/pulls') && u.searchParams.get('page') === '1') result = Array.from({ length: 100 }, () => ({ head: { ref: 'unrelated' } }));
    else if (u.pathname.endsWith('/pulls')) result = [pr()];
    else if (u.pathname.endsWith('/files')) result = [{ filename: 'about.html', status: 'modified' }];
    else result = pr();
    pages.push(u.pathname + u.search); return { ok: true, json: async () => result };
  });
  assert.equal((await findOwnedPr(api, revision)).number, 1);
  assert(pages.some(p => p.includes('page=2'))); assert(pages.some(p => p.includes('/files?per_page=100&page=1')));
});
test('create exact Draft with content base, no merge/deploy; update uses verified lease predecessor', async () => {
  for (const existing of [null, pr()]) {
    const m = mock(existing); const result = await publishStagingPages(options(m));
    assert.equal(result.action, existing ? 'updated-draft' : 'created-draft');
    assert.equal(m.calls.filter(c => c.method === 'PUSH').length, 1);
    const create = m.calls.find(c => c.method === 'POST');
    if (!existing) { assert.equal(create.body.base, 'content/staging'); assert.equal(create.body.draft, true); assert.equal(create.body.head, BRANCH); }
    assert(!m.calls.some(c => /merge|dispatch|delete/.test(c.path || '')));
  }
});
test('no-op has no mutations; stale own Draft closes without commit/push', async () => {
  for (const existing of [null, pr()]) {
    const m = mock(existing); await publishStagingPages({ ...options(m, false), createCommit: () => assert.fail('commit'), push: () => assert.fail('push') });
    assert.deepEqual(m.calls.filter(c => c.method !== 'GET'), existing ? [{ path: 'pulls/1', method: 'PATCH', body: { state: 'closed' } }] : []);
  }
});
for (const changes of [true, false]) test(`orphan branch fails closed even on no-op (${changes})`, async () => {
  const m = mock(null, generated); await assert.rejects(publishStagingPages(options(m, changes)), /Unowned/);
  assert(!m.calls.some(c => c.method !== 'GET'));
});
for (const field of ['codeSha', 'contentSha']) for (const stage of [1, 2, 3, 4, 5]) {
  test(`${field} movement at gate ${stage} aborts without retries`, async () => {
    const m = mock(); let checks = 0, commits = 0;
    await assert.rejects(publishStagingPages({ ...options(m), createCommit: () => { commits++; return generated; },
      checkHeads: () => { checks++; assertHeads(revision, { ...revision, ...(checks === stage ? { [field]: 'd'.repeat(40) } : {}) }); }
    }), /moved/);
    assert.equal(checks, stage); assert.equal(commits, stage > 2 ? 1 : 0);
    assert.equal(m.calls.filter(c => c.method === 'PUSH').length, stage > 3 ? 1 : 0);
    assert.equal(m.calls.filter(c => c.method === 'POST').length, stage > 4 ? 1 : 0);
  });
}
test('post-create PR base drift rejected, not silently reconciled', async () => {
  const m = mock(); const api = async (...args) => { const result = await m.api(...args); if (args[1] === 'POST') result.base.sha = 'd'.repeat(40); return result; }; api.all = m.api.all;
  await assert.rejects(publishStagingPages({ ...options(m), api }), /base SHA/);
});
test('unknown environment branch and multiple candidate PRs block publication', async () => {
  const m = mock(pr()); const prior = m.api.all;
  m.api.all = async path => path === 'pulls?state=open' ? [pr(), pr()] : prior(path);
  await assert.rejects(publishStagingPages(options(m)), /Multiple/);
  const p = pr(); p.head.ref = 'automation/wordpress-pages/live'; const foreign = mock(p);
  await assert.rejects(publishStagingPages(options(foreign)), /owned/);
});
