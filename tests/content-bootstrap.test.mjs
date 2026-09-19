import test from 'node:test';
import assert from 'node:assert/strict';
import { rm, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureRepo, fixtureGit, fixtureBlob, fixtureCommit, diskInventory } from './helpers/content-bootstrap-fixture.mjs';
import { readCommitSnapshot } from '../scripts/content/git-snapshot.mjs';
import { projectedTreeSha } from '../scripts/content/git-tree-hash.mjs';
import { planContentBootstrap, validateContentCommit } from '../scripts/content/bootstrap-plan.mjs';
import { planContentBuild } from '../scripts/content/build-plan.mjs';
import { parseBootstrapArguments } from '../scripts/content/bootstrap-content-branch.mjs';
import { contentRevision } from '../scripts/content/revision.mjs';
import { projectContent } from '../scripts/content/content-projection.mjs';

const cli = fileURLToPath(new URL('../scripts/content/bootstrap-content-branch.mjs', import.meta.url));
const binding = { environment: 'staging', contentRef: 'content/staging' };
async function setup(t) {
  const root = await fixtureRepo();
  t.after(() => rm(root, { recursive: true, force: true }));
  const sha = fixtureBlob(root, Buffer.from('fixture\r\n'));
  return { root, sha };
}
const bootstrap = (root, sourceSha, environment = 'staging') => planContentBootstrap({ repoRoot: root, sourceSha, environment });
const validate = (root, contentSha) => validateContentCommit({ repoRoot: root, contentSha, ...binding });

test('explicit existing commit required; tree, blob, tag, missing and symbolic revisions fail', async t => {
  const { root, sha } = await setup(t);
  const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha }]);
  assert.equal(bootstrap(root, source.commit).sourceSha, source.commit);
  const tag = fixtureGit(root, ['mktag'], `object ${source.commit}\ntype commit\ntag fixture\ntagger Fixture <fixture@example.invalid> 1767225600 +0000\n\nfixture\n`).toString().trim();
  for (const invalid of [undefined, '', 'HEAD', 'main', 'origin/main', 'a'.repeat(40), source.tree, sha, tag, source.commit.toUpperCase(), source.commit + '\n']) {
    assert.throws(() => bootstrap(root, invalid));
  }
});

test('only central MUTABLE/GENERATED scope; excluded source files explicitly inventoried', async t => {
  const { root, sha } = await setup(t);
  const files = ['sitemap.xml', 'public/residents/data/residents.json', 'events/id/index.html'];
  const source = fixtureCommit(root, [...files, 'scripts/code.mjs', 'unknown.json', 'public/residents/data/recovery-note.txt'].map(path => ({ path, sha })));
  const plan = bootstrap(root, source.commit);
  assert.deepEqual(plan.files.map(file => file.path), [...files].sort());
  assert.deepEqual(plan.excludedCounts, { code: 1, unknown: 2 });
  assert.equal(plan.inventory.mutable, 1);
  assert.equal(plan.inventory.generated, 2);
  assert.equal(plan.inventory.total, 3);
  assert.equal(plan.treeSha, fixtureCommit(root, files.map(path => ({ path, sha }))).tree);
  assert.deepEqual(bootstrap(root, source.commit), plan);
});

test('binary and text blobs remain byte-identical, including NUL and CRLF', async t => {
  const { root } = await setup(t);
  const paths = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].map(ext => `public/gallery/media/fixture/image.${ext}`)
    .concat(['public/residents/media/fixture/presskit/file.pdf', 'public/residents/media/fixture/presskit/file.zip', 'sitemap.xml']);
  const bytes = Buffer.from([0, 255, 128, 13, 10, 0, 254, 1]);
  const files = paths.map(path => ({ path, sha: fixtureBlob(root, bytes) }));
  const source = fixtureCommit(root, files);
  const projected = bootstrap(root, source.commit);
  assert.equal(projected.treeSha, source.tree);
  for (const file of projected.files) {
    assert.equal(file.sha, files.find(entry => entry.path === file.path).sha);
    assert.deepEqual(fixtureGit(root, ['cat-file', 'blob', file.sha]), bytes);
    assert.equal(file.mode, '100644');
  }
});

test('tree hashing uses Git directory ordering and is independent of input order', async t => {
  const { root, sha } = await setup(t);
  const files = ['a/z', 'a.c', 'a0/z', 'a-thing', 'z'].map(path => ({ path, sha, mode: '100644', type: 'blob' }));
  assert.equal(projectedTreeSha(files), fixtureCommit(root, files).tree);
  assert.equal(projectedTreeSha([...files].reverse()), projectedTreeSha(files));
  assert.equal(projectedTreeSha([]), fixtureCommit(root, []).tree);
  assert.throws(() => projectedTreeSha([files[0], files[0]]));
});

for (const [mode, type] of [['120000', 'blob'], ['100755', 'blob'], ['160000', 'commit']]) {
  test(`content mode ${mode} rejected in projection and validation`, async t => {
    const { root, sha } = await setup(t);
    const target = type === 'commit' ? fixtureCommit(root, []).commit : sha;
    const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha: target, mode, type }]);
    assert.throws(() => bootstrap(root, source.commit), /100644/);
    assert.throws(() => validate(root, source.commit), /100644/);
  });
}
test('tree object disguised as an allowed file is rejected', async t => {
  const { root } = await setup(t);
  const empty = fixtureCommit(root, []).tree;
  const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha: empty, mode: '040000', type: 'tree' }]);
  assert.throws(() => bootstrap(root, source.commit), /100644/);
});
test('unexpected modes are rejected without silent mode normalization', () => {
  for (const mode of ['100664', '100600', '0100644', '000000']) {
    assert.throws(() => projectContent([{ path: 'sitemap.xml', sha: 'a'.repeat(40), type: 'blob', mode }]), /100644/);
  }
});
test('missing blob object fails locally instead of returning an incomplete plan', async t => {
  const { root } = await setup(t);
  const tree = fixtureGit(root, ['mktree', '--missing'], `100644 blob ${'a'.repeat(40)}\tsitemap.xml\n`).toString().trim();
  const commit = fixtureGit(root, ['commit-tree', tree], 'Missing fixture\n').toString().trim();
  assert.throws(() => bootstrap(root, commit), /Blobobjekte/);
});
test('strict content validator rejects code, unknown, recovery and extra empty directories', async t => {
  const { root, sha } = await setup(t);
  for (const path of ['scripts/code.mjs', 'unknown.json', 'public/residents/data/residents-backup-before-restore.json']) {
    const source = fixtureCommit(root, [{ path, sha }]);
    assert.throws(() => validate(root, source.commit), /unerlaubte Pfade/);
  }
  const source = fixtureCommit(root, [{ path: 'unknown-dir', sha: fixtureCommit(root, []).tree, type: 'tree', mode: '040000' }]);
  assert.throws(() => validate(root, source.commit), /nicht exakt/);
});

test('same source means same content tree but separate environment and ref', async t => {
  const { root, sha } = await setup(t);
  const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha }]);
  const staging = bootstrap(root, source.commit), live = bootstrap(root, source.commit, 'live');
  assert.equal(staging.treeSha, live.treeSha);
  assert.equal(staging.targetRef, 'content/staging');
  assert.equal(live.targetRef, 'content/live');
  assert.throws(() => validateContentCommit({ repoRoot: root, contentSha: source.commit, environment: 'live', contentRef: 'content/staging' }));
  assert.equal(validate(root, source.commit).commitSha, source.commit);
});

test('deletion is snapshot-based; working tree leftovers cannot revive content', async t => {
  const { root, sha } = await setup(t);
  const old = fixtureCommit(root, [{ path: 'sitemap.xml', sha }, { path: 'events/removed/index.html', sha }]);
  const current = fixtureCommit(root, [{ path: 'sitemap.xml', sha }], old.commit);
  await mkdir(path.join(root, 'events/removed'), { recursive: true });
  await writeFile(path.join(root, 'events/removed/index.html'), 'stale workspace content');
  const plan = bootstrap(root, current.commit);
  assert.equal(plan.treeSha, current.tree);
  assert.deepEqual(plan.files.map(file => file.path), ['sitemap.xml']);
  const build = planContentBuild({ repoRoot: root, ...binding, codeSha: old.commit, contentSha: current.commit });
  assert.ok(build.removePaths.includes('events/removed/index.html'));
  assert.equal(build.overlay.some(file => file.path.includes('removed')), false);
});

test('CLI dry-run changes no files, objects or refs and prints no blob content', async t => {
  const { root, sha } = await setup(t);
  const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha }]);
  await writeFile(path.join(root, 'untouched.txt'), 'workspace sentinel');
  const before = await diskInventory(root);
  const refsBefore = fixtureGit(root, ['for-each-ref']).toString();
  const result = JSON.parse(execFileSync(process.execPath, [cli, '--environment', 'staging', '--source-sha', source.commit, '--dry-run'], { cwd: root, encoding: 'utf8' }));
  assert.equal(result.treeSha, source.tree);
  assert.equal(result.inventory.total, 1);
  assert.equal(Object.hasOwn(result, 'files'), false);
  assert.equal(JSON.stringify(result).includes('fixture\\r\\n'), false);
  assert.deepEqual(await diskInventory(root), before);
  assert.equal(fixtureGit(root, ['for-each-ref']).toString(), refsBefore);
  const strict = JSON.parse(execFileSync(process.execPath, [cli, '--environment', 'staging', '--content-ref', 'content/staging', '--content-sha', source.commit, '--validate'], { cwd: root, encoding: 'utf8' }));
  assert.equal(strict.commitSha, source.commit);
  assert.deepEqual(await diskInventory(root), before);
});

for (const args of [[], ['--write'], ['--create-ref'], ['--push'], ['--dry-run'], ['--source-sha', 'x'], ['--dry-run', '--dry-run'], ['--dry-run', '--validate'], ['--source-sha', '--dry-run'], ['--validate']]) {
  test(`unsafe/incomplete CLI arguments ${JSON.stringify(args)}`, () => assert.throws(() => parseBootstrapArguments(args)));
}
test('build plan binds checked commits, environment, revision identity and deletion order', async t => {
  const { root, sha } = await setup(t);
  const code = fixtureCommit(root, [{ path: 'index.html', sha }, { path: 'sitemap.xml', sha }]);
  const content = fixtureCommit(root, [{ path: 'sitemap.xml', sha }]);
  const options = { repoRoot: root, ...binding, codeSha: code.commit, contentSha: content.commit };
  const plan = planContentBuild(options);
  assert.deepEqual(planContentBuild(options), plan);
  assert.equal(plan.artifactId, contentRevision(options).artifactId);
  assert.equal(plan.buildTarget, 'staging');
  assert.equal(plan.steps[1], 'remove-all-classified-content');
  assert.equal(plan.steps[2], 'overlay-validated-content');
  assert.throws(() => planContentBuild({ ...options, contentRef: 'content/live' }));
  assert.throws(() => planContentBuild({ ...options, codeSha: code.tree }));
  assert.throws(() => planContentBuild({ ...options, contentSha: code.commit }));
});
test('build plan refuses an overlay across a code/unknown file-directory boundary', async t => {
  const { root, sha } = await setup(t);
  const code = fixtureCommit(root, [{ path: 'events', sha }]);
  const content = fixtureCommit(root, [{ path: 'events/id/index.html', sha }]);
  assert.throws(() => planContentBuild({ repoRoot: root, ...binding, codeSha: code.commit, contentSha: content.commit }), /überschreiben/);
});
test('Git replace refs do not change the explicitly requested source', async t => {
  const { root, sha } = await setup(t);
  const source = fixtureCommit(root, [{ path: 'sitemap.xml', sha }]);
  const replacement = fixtureCommit(root, []);
  fixtureGit(root, ['replace', source.commit, replacement.commit]);
  assert.equal(readCommitSnapshot({ repoRoot: root, commitSha: source.commit }).treeSha, source.tree);
});
