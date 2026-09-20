import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { composeSite } from '../scripts/content/site-composition.mjs';
import { validateComposedSite } from '../scripts/content/composition-validator.mjs';
import { replacementScope } from '../scripts/content/replacement-scope.mjs';
import { fixtureRepo, fixtureBlob, fixtureCommit, diskInventory } from './helpers/content-bootstrap-fixture.mjs';

async function fixture(t) {
  const root = await fixtureRepo();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const entry = (name, bytes = name, extra = {}) => ({ path: name, sha: fixtureBlob(root, bytes), ...extra });
  const code = fixtureCommit(root, [entry('index.html'), entry('assets/code.js'), entry('public/site/data/code.txt'),
    entry('events/old/index.html'), entry('public/residents/data/recovery-note.txt'), entry('public/events/data/backup.json')]);
  const content = fixtureCommit(root, [entry('events/new/index.html'), entry('public/residents/data/residents.json', '{}\r\n'),
    entry('public/residents/media/fixture/photos/image.jpg', Buffer.from([255, 216, 0, 128, 255, 217])),
    entry('public/residents/media/fixture/presskit/test.pdf', Buffer.from('%PDF\r\n\x00\xff', 'latin1')),
    entry('public/residents/media/fixture/presskit/test.zip', Buffer.from([80, 75, 3, 4, 0, 255]))]);
  // Git objects stay in root; output must be outside repository, so use sibling
  // directory and register explicit cleanup, never remove the user's repository.
  const output = root + '-output';
  t.after(() => rmSync(output, { recursive: true, force: true }));
  return { root, entry, code, content, output, options: { repoRoot: root, environment: 'staging',
    contentRef: 'content/staging', codeSha: code.commit, contentSha: content.commit, output } };
}

test('composition replaces full content namespaces, preserves code, and reproduces bytes', async t => {
  const f = await fixture(t);
  const report = composeSite(f.options);
  const files = await diskInventory(f.output);
  assert.equal(report.valid, true);
  assert.equal(report.contentTreeSha, f.content.tree);
  assert.equal(report.contentFileCount, 5);
  assert.equal(report.artifactId, `staging-code-${f.code.commit}-content-${f.content.commit}`);
  assert.deepEqual(Object.keys(files).sort(), ['assets/code.js', 'events/new/index.html', 'index.html',
    'public/site/data/code.txt', 'public/residents/data/residents.json',
    'public/residents/media/fixture/photos/image.jpg', 'public/residents/media/fixture/presskit/test.pdf',
    'public/residents/media/fixture/presskit/test.zip'].sort());
  assert.equal(readFileSync(path.join(f.output, 'public/residents/data/residents.json'), 'utf8'), '{}\r\n');
  assert.deepEqual(readFileSync(path.join(f.output, 'public/residents/media/fixture/photos/image.jpg')), Buffer.from([255, 216, 0, 128, 255, 217]));
  assert.deepEqual(readFileSync(path.join(f.output, 'public/residents/media/fixture/presskit/test.pdf')), Buffer.from('%PDF\r\n\x00\xff', 'latin1'));
  assert.deepEqual(readFileSync(path.join(f.output, 'public/residents/media/fixture/presskit/test.zip')), Buffer.from([80, 75, 3, 4, 0, 255]));
  assert.deepEqual(report.removedUnknownPaths.sort(), ['public/events/data/backup.json', 'public/residents/data/recovery-note.txt']);
  const second = f.output + '-second';
  t.after(() => rmSync(second, { recursive: true, force: true }));
  assert.deepEqual(composeSite({ ...f.options, output: second }), report);
  assert.deepEqual(await diskInventory(second), files);
});

test('empty output allowed; nonempty target and repository output rejected without overwrite', async t => {
  const f = await fixture(t);
  mkdirSync(f.output);
  composeSite(f.options);
  assert.throws(() => composeSite(f.options), /leer/);
  assert.throws(() => composeSite({ ...f.options, output: path.join(f.root, 'output') }), /außerhalb/);
  assert.throws(() => composeSite({ ...f.options, output: '.' }), /absolutes/);
});

test('environment/ref mismatch, live composition and invalid immutable revisions fail', async t => {
  const f = await fixture(t);
  for (const patch of [{ contentRef: 'content/live' }, { environment: 'live', contentRef: 'content/live' },
    { contentSha: 'main' }, { contentSha: 'f'.repeat(40) }, { codeSha: 'HEAD' },
    { codeSha: f.code.tree }, { contentSha: f.content.tree },
    { contentSha: fixtureBlob(f.root, 'blob') }, { codeSha: fixtureBlob(f.root, 'blob') }]) {
    assert.throws(() => composeSite({ ...f.options, ...patch }));
  }
});

test('content cannot overwrite code or introduce UNKNOWN content', async t => {
  const f = await fixture(t);
  for (const name of ['index.html', 'assets/code.js', 'public/residents/data/recovery.txt']) {
    const invalid = fixtureCommit(f.root, [f.entry(name)]);
    assert.throws(() => composeSite({ ...f.options, contentSha: invalid.commit }), /unerlaubte Pfade/);
  }
});

test('mixed namespaces fail closed; exact-file ownership does not delete neighbouring code', () => {
  const owns = replacementScope();
  assert.equal(owns('public/site/data/site-navigation.json'), true);
  assert.equal(owns('public/site/data/code.txt'), false);
  assert.equal(owns('public/residents/residents-createandedit.html'), false);
  assert.throws(() => replacementScope({ rules: [
    { classification: 'GENERATED', tree: 'mixed/', pattern: '.*' },
    { classification: 'CODE', exact: 'mixed/code.js' }
  ] }), /Gemischter/);
});

test('final validator detects missing, stale, injected, changed bytes and wrong tree', async t => {
  const f = await fixture(t);
  composeSite(f.options);
  const options = { ...f.options, contentTreeSha: f.content.tree };
  assert.throws(() => validateComposedSite({ ...options, contentTreeSha: f.code.tree }), /Tree/);
  assert.throws(() => validateComposedSite({ ...options, codeSha: f.content.commit }));
  const file = path.join(f.output, 'events/new/index.html');
  const bytes = readFileSync(file);
  writeFileSync(file, 'changed');
  assert.throws(() => validateComposedSite(options), /Blob/);
  rmSync(file);
  assert.throws(() => validateComposedSite(options));
  writeFileSync(file, bytes);
  const recovery = path.join(f.output, 'public/residents/data/recovery.txt');
  writeFileSync(recovery, 'must not ship');
  assert.throws(() => validateComposedSite(options), /Unerwarteter/);
  rmSync(recovery);
  assert.equal(validateComposedSite(options).valid, true);
});

test('symlink/gitlink and executable content blocked; code executable modes preserved on POSIX', async t => {
  const f = await fixture(t);
  for (const extra of [{ mode: '120000' }, { mode: '100755' }, { mode: '160000', type: 'commit', sha: f.code.commit }]) {
    const content = fixtureCommit(f.root, [f.entry('events/new/index.html', 'x', extra)]);
    assert.throws(() => composeSite({ ...f.options, contentSha: content.commit }));
  }
  const code = fixtureCommit(f.root, [f.entry('assets/link', 'index.html', { mode: '120000' })]);
  assert.throws(() => composeSite({ ...f.options, codeSha: code.commit }), /Symlink/);
  const executable = fixtureCommit(f.root, [f.entry('scripts/run.sh', '#!/bin/sh\n', { mode: '100755' })]);
  if (process.platform === 'win32') {
    assert.throws(() => composeSite({ ...f.options, codeSha: executable.commit }), /Windows/);
  } else {
    const options = { ...f.options, codeSha: executable.commit };
    composeSite(options);
    chmodSync(path.join(f.output, 'scripts/run.sh'), 0o644);
    assert.throws(() => validateComposedSite({ ...options, contentTreeSha: f.content.tree }), /Mode/);
  }
});

test('disk symlink injection and output symlink rejected', async t => {
  const f = await fixture(t);
  composeSite(f.options);
  symlinkSync(f.root, path.join(f.output, 'injected'), 'junction');
  assert.throws(() => validateComposedSite({ ...f.options, contentTreeSha: f.content.tree }), /Symlink/);
  const link = f.output + '-link';
  t.after(() => rmSync(link, { force: true }));
  symlinkSync(f.output, link, 'junction');
  assert.throws(() => composeSite({ ...f.options, output: link }), /Symlink/);
});

test('secret-like bytes blocked without echoing them; unsafe paths never materialized', async t => {
  const f = await fixture(t);
  const secret = 'gh' + 'p_' + 'a'.repeat(36);
  const code = fixtureCommit(f.root, [f.entry('assets/config.js', secret)]);
  assert.throws(() => composeSite({ ...f.options, codeSha: code.commit }), error =>
    /Secret/.test(error.message) && !error.message.includes(secret));
  for (const name of ['.env', 'assets/key.pem']) {
    const unsafe = fixtureCommit(f.root, [f.entry(name)]);
    assert.throws(() => composeSite({ ...f.options, codeSha: unsafe.commit }), /Snapshot-Pfad/);
  }
});
