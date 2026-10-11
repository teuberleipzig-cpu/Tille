import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fixtureRepo, fixtureBlob, fixtureCommit, fixtureGit } from './helpers/content-bootstrap-fixture.mjs';
import { bindStagingDeployment, assertNoLegacyContentWrite } from '../scripts/content/deployment-binding.mjs';
import { verifyCompositionReport, sha256 } from '../scripts/content/deployment-report.mjs';
import { contentRevision } from '../scripts/content/revision.mjs';
import { CONTENT_MANIFEST } from '../scripts/content/content-manifest.mjs';
import { classifyContentPath } from '../scripts/content/content-scope.mjs';

const codeSha = 'a'.repeat(40), contentSha = 'b'.repeat(40);
const binding = { eventName: 'push', ref: 'refs/heads/main', codeSha, actualCodeSha: codeSha, contentSha };

test('push revision and explicit manual code/content binding; no default or free ref', () => {
  assert.equal(bindStagingDeployment(binding).artifactId, `staging-code-${codeSha}-content-${contentSha}`);
  const manual = { ...binding, eventName: 'workflow_dispatch', inputs: { expected_sha: codeSha, expected_content_sha: contentSha } };
  assert.equal(bindStagingDeployment(manual).contentRef, 'content/staging');
  for (const inputs of [{}, { expected_sha: codeSha }, { expected_content_sha: contentSha },
    { ...manual.inputs, expected_sha: contentSha }, { ...manual.inputs, expected_content_sha: codeSha },
    { ...manual.inputs, expected_content_sha: 'HEAD' }, { ...manual.inputs, expected_content_sha: contentSha.toUpperCase() }]) {
    assert.throws(() => bindStagingDeployment({ ...manual, inputs }));
  }
  for (const patch of [{ ref: 'refs/heads/content/staging' }, { ref: 'refs/heads/feature' },
    { eventName: 'pull_request' }, { actualCodeSha: contentSha }, { contentSha: undefined }]) {
    assert.throws(() => bindStagingDeployment({ ...binding, ...patch }));
  }
});

async function repo(t) {
  const root = await fixtureRepo();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = (name, text = name) => ({ path: name, sha: fixtureBlob(root, text) });
  return { root, entry };
}

test('push diff handles multi-commit range and merge commit, not only HEAD parent', async t => {
  const { root, entry } = await repo(t);
  const base = fixtureCommit(root, [entry('index.html')]);
  const content = fixtureCommit(root, [entry('index.html'), entry('sitemap.xml')], base.commit);
  const tip = fixtureCommit(root, [entry('index.html', 'changed'), entry('sitemap.xml')], content.commit);
  assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: tip.commit }), /Legacy content write/);
  const side = fixtureCommit(root, [entry('index.html', 'side')], base.commit);
  const merge = fixtureGit(root, ['commit-tree', tip.tree, '-p', side.commit, '-p', tip.commit], 'merge\n').toString().trim();
  assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: merge }), /Legacy content write/);
  assert.equal(assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: side.commit }).valid, true);
});

for (const name of ['public/events/data/months/2026-09.json', 'events/event/index.html', 'public/events/media/shared/x.jpg',
  'public/residents/data/residents.json', 'public/residents/media/x/photos/x.jpg', 'public/gallery/data/gallery.json',
  'public/site/data/site-navigation.json', 'news/item/index.html', 'sitemap.xml', 'public/residents/data/recovery.txt',
  'residents/fixture/index.html', 'news.html', 'news/index.html', 'public/gallery/media/fixture/image.jpg', 'unknown.json']) {
  test(`legacy content additions/modifications/deletions blocked: ${name}`, async t => {
    const { root, entry } = await repo(t);
    const base = fixtureCommit(root, [entry('index.html')]);
    const added = fixtureCommit(root, [entry('index.html'), entry(name)], base.commit);
    const modified = fixtureCommit(root, [entry('index.html'), entry(name, 'changed')], added.commit);
    const deleted = fixtureCommit(root, [entry('index.html')], modified.commit);
    for (const [beforeSha, codeSha] of [[base.commit, added.commit], [added.commit, modified.commit], [modified.commit, deleted.commit]]) {
      assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha, codeSha }), /Legacy content write/);
    }
  });
}

for (const name of ['about.html', 'history.html']) test(`explicit GENERATED code fallback may change on main: ${name}`, async t => {
  const rule = classifyContentPath(name);
  assert.equal(rule.classification, 'GENERATED'); assert.equal(rule.codeFallback, true);
  const { root, entry } = await repo(t);
  const base = fixtureCommit(root, [entry(name, 'old template')]);
  const tip = fixtureCommit(root, [entry(name, 'new template')], base.commit);
  assert.deepEqual(assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: tip.commit }), { changedFiles: 1, valid: true });
});

test('fallback exemption derives strictly from the manifest flag, not filenames or GENERATED alone', async t => {
  const source = readFileSync(new URL('../scripts/content/deployment-binding.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /about\.html|history\.html/);
  assert.match(source, /rule\.codeFallback !== true/);
  assert.deepEqual(CONTENT_MANIFEST.rules.filter(rule => rule.codeFallback === true).map(rule => rule.exact).sort(), ['about.html', 'history.html']);
  // Isolated module fixture changes only the classifier result, not the production manifest.
  // The same real Git diff must be blocked without an exact boolean true flag.
  const { root, entry } = await repo(t);
  const base = fixtureCommit(root, [entry('about.html', 'old')]);
  const tip = fixtureCommit(root, [entry('about.html', 'new')], base.commit);
  const absoluteImports = source.replace(/from '(\.\/[^']+)'/g, (_, specifier) =>
    `from '${new URL(specifier, new URL('../scripts/content/deployment-binding.mjs', import.meta.url)).href}'`);
  for (const flag of [undefined, false, 'true']) {
    const fixtureSource = absoluteImports.replace('const rule = classifyContentPath(path);',
      `const rule = { ...classifyContentPath(path), codeFallback: ${JSON.stringify(flag) ?? 'undefined'} };`);
    const isolated = await import('data:text/javascript;base64,' + Buffer.from(fixtureSource).toString('base64'));
    assert.throws(() => isolated.assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: tip.commit }), /Legacy content write/);
  }
});

test('renaming content to code cannot hide a legacy change; unreliable baselines fail closed', async t => {
  const { root, entry } = await repo(t);
  const blob = entry('sitemap.xml', 'same bytes');
  const base = fixtureCommit(root, [blob]);
  const renamed = fixtureCommit(root, [{ ...blob, path: 'docs/archive.xml' }], base.commit);
  assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: renamed.commit }), /Legacy/);
  const unrelated = fixtureCommit(root, [entry('index.html')]);
  for (const beforeSha of ['0'.repeat(40), 'f'.repeat(40), unrelated.commit, base.tree, 'HEAD']) {
    assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha, codeSha: renamed.commit }));
  }
  assert.throws(() => assertNoLegacyContentWrite({ repoRoot: root, beforeSha: base.commit, codeSha: renamed.commit, forced: true }));
});

test('composition report binds revision and hashes exact code/content bytes', async t => {
  const { root } = await repo(t);
  mkdirSync(path.join(root, 'public/events/data'), { recursive: true });
  const code = Buffer.from('code\r\n'), content = Buffer.from('{"test":true}\n');
  writeFileSync(path.join(root, 'index.html'), code);
  writeFileSync(path.join(root, 'public/events/data/manifest.json'), content);
  const report = { ...contentRevision({ environment: 'staging', contentRef: 'content/staging', codeSha, contentSha }),
    valid: true, contentTreeSha: 'c'.repeat(40), contentFileCount: 2 };
  const result = verifyCompositionReport({ report, codeSha, contentSha, output: root });
  assert.equal(result.codeProbeSha256, sha256(code));
  assert.equal(result.contentProbeSha256, sha256(content));
  for (const patch of [{ valid: false }, { environment: 'live' }, { contentRef: 'content/live' }, { codeSha: contentSha },
    { contentSha: codeSha }, { artifactId: 'latest' }, { contentTreeSha: 'HEAD' }, { contentFileCount: 0 }]) {
    assert.throws(() => verifyCompositionReport({ report: { ...report, ...patch }, codeSha, contentSha, output: root }));
  }
});
