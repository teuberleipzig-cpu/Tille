import assert from 'node:assert/strict';
import test from 'node:test';
import { rm } from 'node:fs/promises';
import { bindWriter } from '../scripts/filemaker/staging-contract.mjs';
import { githubWriterIO } from '../scripts/filemaker/staging-github.mjs';
import { fixtureRepo, fixtureCommit, fixtureBlob, fixtureGit } from './helpers/content-bootstrap-fixture.mjs';

const CODE = 'a'.repeat(40), CONTENT = 'b'.repeat(40), HEAD = 'c'.repeat(40), MERGE = 'd'.repeat(40);
const repository = 'fixture/website', ID = 'fm-11111111-2222-3333-4444-555555555555';
const binding = bindWriter({ environment: 'staging', mode: 'sync-pr', codeSha: CODE, contentSha: CONTENT, eventId: ID });

test('real adapter commands use paginated staging PR base, Draft, exact lease and dual revision dispatch', async () => {
  const calls = [];
  const execute = (root, binary, args) => {
    calls.push({ binary, args });
    if (args[0] === 'api' && args.includes('--slurp')) return JSON.stringify([[{ number: 9, head: { ref: binding.branch } }]]);
    if (args[0] === 'api' && args.includes('PUT')) return JSON.stringify({ merged: true, sha: MERGE });
    return '';
  };
  const io = githubWriterIO({ repoRoot: '.', binding, repository, execute });
  await io.pulls(); await io.files(9); await io.push(HEAD, '');
  assert.equal(await io.draft(null, { operation: 'upsert' }), 9);
  await io.ready(9); await io.merge(9, HEAD);
  await io.dispatch({ expected_sha: CODE, expected_content_sha: MERGE });
  assert.ok(calls.some(call => call.args.includes(`repos/${repository}/pulls?state=open&base=content%2Fstaging&per_page=100`)));
  assert.deepEqual(calls.find(call => call.args[0] === 'push').args,
    ['push', `--force-with-lease=refs/heads/${binding.branch}:`, 'origin', `${HEAD}:refs/heads/${binding.branch}`]);
  const create = calls.find(call => call.args[0] === 'pr' && call.args[1] === 'create').args;
  assert.ok(create.includes('--draft')); assert.equal(create[create.indexOf('--base') + 1], 'content/staging');
  assert.deepEqual(calls.find(call => call.args.includes('PUT')).args,
    ['api', '--method', 'PUT', `repos/${repository}/pulls/9/merge`, '-f', 'merge_method=merge', '-f', `sha=${HEAD}`]);
  assert.deepEqual(calls.at(-1).args, ['workflow', 'run', 'docker-publish.yml', '--repo', repository, '--ref', 'main',
    '-f', `expected_sha=${CODE}`, '-f', `expected_content_sha=${MERGE}`]);
});

test('adapter redrafts an existing PR before verification, never enables auto-merge', async () => {
  const calls = [];
  const execute = (root, binary, args) => {
    calls.push(args);
    if (args.includes('--slurp')) return JSON.stringify([[{ number: 9, head: { ref: binding.branch } }]]);
    if (args[0] === 'api') return JSON.stringify({ draft: false });
    return '';
  };
  const io = githubWriterIO({ repoRoot: '.', binding, repository, execute });
  assert.equal(await io.draft(9, { operation: 'remove' }), 9);
  assert.ok(calls.some(args => args.join(' ') === `pr ready 9 --repo ${repository} --undo`));
  assert.ok(!calls.flat().some(arg => arg === '--auto'));
});

test('postmerge accepts only exact content parents and generated tree', async t => {
  const repoRoot = await fixtureRepo(); t.after(() => rm(repoRoot, { recursive: true, force: true }));
  const entry = text => ({ path: 'sitemap.xml', sha: fixtureBlob(repoRoot, text) });
  const base = fixtureCommit(repoRoot, [entry('base')]);
  const head = fixtureCommit(repoRoot, [entry('new')], base.commit);
  const makeMerge = (tree, parent) => fixtureGit(repoRoot, ['commit-tree', tree, '-p', parent, '-p', head.commit], 'fixture merge').toString().trim();
  const good = makeMerge(head.tree, base.commit);
  const wrongTree = makeMerge(base.tree, base.commit);
  const foreign = fixtureCommit(repoRoot, [entry('foreign')]);
  const wrongBase = makeMerge(head.tree, foreign.commit);
  const requests = [];
  const io = githubWriterIO({ repoRoot, binding: { ...binding, contentSha: base.commit }, repository,
    execute: (root, binary, args) => { requests.push(args); return ''; } });
  await io.verifyMerge(good, head.commit);
  await assert.rejects(io.verifyMerge(wrongTree, head.commit), /parent\/tree mismatch/);
  await assert.rejects(io.verifyMerge(wrongBase, head.commit), /parent\/tree mismatch/);
  assert.deepEqual(requests[0], ['fetch', '--no-tags', '--no-write-fetch-head', 'origin', good]);
});
