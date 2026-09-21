import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { writerEnvironment, bindWriter, assertWriterPaths, singleWriterPull, verifyWriterPull } from '../scripts/filemaker/staging-contract.mjs';
import { runStagingWriter } from '../scripts/filemaker/staging-writer.mjs';
import { main } from '../scripts/filemaker/run-staging-writer.mjs';

const ID = 'fm-11111111-2222-3333-4444-555555555555';
const CODE = 'a'.repeat(40), CONTENT = 'b'.repeat(40), HEAD = 'c'.repeat(40), MERGE = 'd'.repeat(40);
const repository = 'fixture/website';
const binding = bindWriter({ environment: 'staging', mode: 'sync-pr', codeSha: CODE, contentSha: CONTENT, eventId: ID });
const files = ['public/events/data/manifest.json', `events/${ID}/index.html`, 'sitemap.xml'];
const validPull = () => ({ number: 7, state: 'open', draft: true, auto_merge: null, changed_files: files.length,
  base: { ref: 'content/staging', sha: CONTENT, repo: { full_name: repository } },
  head: { ref: binding.branch, sha: HEAD, repo: { full_name: repository } } });

function harness(options = {}) {
  const calls = []; let exists = Boolean(options.existing), merged = false, checks = 0;
  const io = {
    repository,
    revisions: async () => {
      calls.push('revisions'); checks++;
      return { codeSha: options.moveCodeAt === checks ? MERGE : CODE,
        contentSha: options.moveContentAt === checks ? HEAD : merged ? MERGE : CONTENT };
    },
    pulls: async () => { calls.push('pulls'); return options.pulls || (exists ? [validPull()] : []); },
    pull: async () => { calls.push('pull'); return options.pull || validPull(); },
    files: async () => { calls.push('files'); return options.files || files.map(filename => ({ filename })); },
    verifyHead: async (head, paths) => { calls.push('verifyHead'); assert.equal(head, HEAD); assert.deepEqual(paths, files); },
    branchHead: async () => { calls.push('branchHead'); return exists ? HEAD : ''; },
    commit: async () => { calls.push('commit'); return HEAD; },
    push: async (head, lease) => { calls.push('push'); assert.equal(head, HEAD); assert.equal(lease, exists ? HEAD : ''); },
    draft: async number => { calls.push(number ? 'update-draft' : 'create-draft'); exists = true; return 7; },
    ready: async () => { calls.push('ready'); },
    merge: async (number, head) => { calls.push('merge'); assert.equal(number, 7); assert.equal(head, HEAD); merged = true; return options.merge || { merged: true, sha: MERGE }; },
    verifyMerge: async (sha, head) => { calls.push('verifyMerge'); assert.equal(sha, MERGE); assert.equal(head, HEAD); },
    dispatch: async inputs => { calls.push('dispatch'); assert.deepEqual(inputs, { expected_sha: CODE, expected_content_sha: MERGE }); }
  };
  return { calls, run: () => runStagingWriter({ binding: options.validate ? { ...binding, mode: 'validate-only' } : binding,
    prepare: async () => { calls.push('prepare'); return { hasChanges: !options.noChanges, changedFiles: files }; }, io }) };
}

for (const environment of [undefined, '', 'production', 'main', 'STAGING', ' staging']) {
  test(`environment rejects ${JSON.stringify(environment)} without fallback`, () => assert.throws(() => writerEnvironment(environment, 'sync-pr')));
}
for (const mode of ['sync-pr', 'validate-only']) {
  test(`live ${mode} fails closed with explicit message`, async () => {
    assert.throws(() => writerEnvironment('live', mode), /Live FileMaker publishing is not activated yet\./);
    await assert.rejects(main({ FILEMAKER_ENVIRONMENT: 'live', FILEMAKER_MODE: mode }), /Live FileMaker publishing is not activated yet\./);
  });
}
test('staging binding pins both SHAs and validated environment branch', () => {
  assert.equal(binding.codeSha, CODE); assert.equal(binding.contentSha, CONTENT);
  assert.equal(binding.contentRef, 'content/staging');
  assert.equal(binding.branch, `automation/filemaker-event/staging/${ID}`);
  assert.throws(() => bindWriter({ ...binding, eventId: '../main' }));
});
test('entrypoint rejects non-main workflow dispatch before any remote call', async () => {
  await assert.rejects(main({ FILEMAKER_ENVIRONMENT: 'staging', FILEMAKER_MODE: 'sync-pr',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/content/staging' }), /on main/);
});
for (const file of ['scripts/evil.mjs', '.github/workflows/evil.yml', 'unknown.txt', 'public/residents/data/residents.json',
  'public/gallery/data/gallery.json', 'public/site/data/site-navigation.json', 'public/events/media/x.jpg',
  'events/other/index.html', '../sitemap.xml', 'public\\events\\data\\manifest.json']) {
  test(`double scope rejects ${file}`, () => assert.throws(() => assertWriterPaths(binding, [file])));
}
test('double scope retains storage/exact page/sitemap', () => assert.doesNotThrow(() => assertWriterPaths(binding,
  [...files, 'public/events/data/meta.json', 'public/events/data/event-index.json', 'public/events/data/search-index.json', 'public/events/data/months/2026-09.json'])));
test('duplicate relevant PRs fail', () => assert.throws(() => singleWriterPull(binding, [validPull(), validPull()]), /More than one/));
test('different event staging PR fails', () => {
  const pull = validPull(); pull.head.ref += '-other';
  assert.throws(() => singleWriterPull(binding, [pull]), /Another/);
});
test('different-base PR never becomes own PR', () => {
  const pull = validPull(); pull.base.ref = 'main'; assert.equal(singleWriterPull(binding, [pull]), null);
});
test('successful run creates Draft, verifies twice and dispatches code + content MERGE SHA', async () => {
  const h = harness(); const result = await h.run();
  assert.equal(result.contentMergeSha, MERGE);
  assert.deepEqual(h.calls, ['revisions', 'prepare', 'pulls', 'revisions', 'branchHead', 'commit', 'revisions', 'push',
    'create-draft', 'pulls', 'pull', 'files', 'verifyHead', 'revisions', 'ready', 'pulls', 'pull', 'files', 'verifyHead', 'revisions', 'merge', 'verifyMerge', 'revisions', 'dispatch']);
});
test('same event updates Draft with exact remote head lease', async () => {
  const h = harness({ existing: true }); await h.run(); assert.ok(h.calls.includes('update-draft'));
});
for (const [phase, index, forbidden] of [['before generation', 1, 'prepare'], ['before PR', 3, 'push'], ['before Ready', 4, 'ready'], ['before merge', 5, 'merge'], ['after merge', 6, 'dispatch']]) {
  for (const key of ['moveCodeAt', 'moveContentAt']) {
    test(`${key} ${phase} aborts before ${forbidden}`, async () => {
      const h = harness({ [key]: index }); await assert.rejects(h.run(), /moved/); assert.ok(!h.calls.includes(forbidden));
    });
  }
}
for (const existing of [false, true]) {
  test(`no-change existing PR=${existing}: no commit/push/PR mutation/merge/deploy`, async () => {
    const h = harness({ noChanges: true, existing }); assert.equal((await h.run()).action, 'none');
    assert.deepEqual(h.calls, ['revisions', 'prepare', 'pulls', 'revisions']);
  });
}
test('validate-only never queries PRs or invokes any mutation', async () => {
  const h = harness({ validate: true }); assert.equal((await h.run()).action, 'validated');
  assert.deepEqual(h.calls, ['revisions', 'prepare']);
});
for (const [field, value] of [['state', 'closed'], ['number', 8], ['base.ref', 'main'], ['base.sha', CODE],
  ['head.ref', 'automation/filemaker-event/live/x'], ['head.sha', MERGE], ['head.repo.full_name', 'foreign/repo'], ['auto_merge', {}]]) {
  test(`PR gate rejects changed ${field}`, async () => {
    const pull = validPull(); const parts = field.split('.'); let node = pull;
    for (const part of parts.slice(0, -1)) node = node[part]; node[parts.at(-1)] = value;
    const h = harness({ pull }); await assert.rejects(h.run()); assert.ok(!h.calls.includes('ready'));
  });
}
test('renamed foreign file cannot evade allowlist', () => {
  assert.throws(() => verifyWriterPull({ binding, repository, number: 7, headSha: HEAD, pull: validPull(), expectedFiles: files,
    files: files.map(filename => ({ filename, previous_filename: 'public/residents/data/residents.json' })) }));
});
test('GitHub month rename expands to the same deletion/addition paths as the local diff', () => {
  const previous_filename = 'public/events/data/months/2026-09.json';
  const filename = 'public/events/data/months/2026-10.json';
  assert.doesNotThrow(() => verifyWriterPull({ binding, repository, number: 7, headSha: HEAD,
    pull: { ...validPull(), changed_files: 1 }, files: [{ filename, previous_filename, status: 'renamed' }],
    expectedFiles: [previous_filename, filename] }));
});
test('PR head changing after Ready is reverified and cannot merge', async () => {
  let reads = 0;
  const h = harness({ get pull() {
    const pull = validPull(); if (++reads > 1) pull.head.sha = MERGE; return pull;
  } });
  await assert.rejects(h.run(), /mismatch/);
  assert.ok(h.calls.includes('ready')); assert.ok(!h.calls.includes('merge'));
});
test('incomplete or unexpected PR file list fails closed', async () => {
  for (const paths of [[], files.slice(1), [...files.slice(0, 2), 'public/events/data/meta.json']]) {
    const h = harness({ files: paths.map(filename => ({ filename })) }); await assert.rejects(h.run());
    assert.ok(!h.calls.includes('ready'));
  }
});
test('failed merge or invalid merge SHA never dispatches', async () => {
  for (const merge of [{ merged: false, sha: MERGE }, { merged: true, sha: 'main' }]) {
    const h = harness({ merge }); await assert.rejects(h.run()); assert.ok(!h.calls.includes('dispatch'));
  }
});

const workflow = (await readFile(new URL('../.github/workflows/filemaker-event-intake.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const github = await readFile(new URL('../scripts/filemaker/staging-github.mjs', import.meta.url), 'utf8');
test('mandatory environment has no default', () => {
  const input = workflow.split('      environment:')[1].split('      event_json:')[0];
  assert.match(input, /required: true/); assert.match(input, /options: \[staging, live\]/); assert.doesNotMatch(input, /default:/);
});
test('serial writer is not cancelled', () => assert.match(workflow, /group: filemaker-event-intake\n  cancel-in-progress: false/));
test('adapter has exact lease, merge head SHA and two-SHA dispatch (no auto-merge or branch delete)', () => {
  assert.match(github, /--force-with-lease=refs\/heads\/\$\{binding.branch\}:\$\{previousHead\}/);
  assert.match(github, /'merge_method=merge', '-f', `sha=\$\{headSha\}`/);
  assert.match(github, /expected_sha=\$\{inputs.expected_sha\}/); assert.match(github, /expected_content_sha=\$\{inputs.expected_content_sha\}/);
  assert.doesNotMatch(github, /--auto|enablePullRequestAutoMerge|--delete-branch|git switch|git checkout/);
});
