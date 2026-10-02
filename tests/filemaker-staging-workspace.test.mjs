import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fixtureRepo, fixtureBlob, fixtureCommit, fixtureGit } from './helpers/content-bootstrap-fixture.mjs';
import { storageArtifacts } from '../public/site/js/event-storage-model.js';
import { eventSeoArtifacts, eventOutputPath } from '../scripts/events/event-seo.mjs';
import { loadEventDocumentFromWorkspace, prepareFileMakerEvent } from '../scripts/filemaker/filemaker-event-intake.mjs';
import { bindWriter } from '../scripts/filemaker/staging-contract.mjs';
import { prepareStagingWorkspace } from '../scripts/filemaker/staging-workspace.mjs';
import { createContentHead, verifyContentHead } from '../scripts/filemaker/staging-commit.mjs';
import { validateContentCommit } from '../scripts/content/bootstrap-plan.mjs';

const ID = 'fm-11111111-2222-3333-4444-555555555555';
const document = () => ({ meta: { unknown: 'keep' }, events: [
  { id: ID, date: '2026-09-12', title: 'STAGING title', future: { preserve: true }, imageUrl: 'public/events/media/shared/keep.jpg', sections: [] },
  { id: 'unrelated', date: '2026-10-01', title: 'Other STAGING event', sections: [] }
] });
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.distillery.de/</loc></url>
  <url><loc>https://www.distillery.de/news/staging-only/</loc></url>
  <url><loc>https://www.distillery.de/residents/staging-only/</loc></url>
</urlset>
`;

async function setup(t, mode = 'sync-pr') {
  const repoRoot = await fixtureRepo();
  const output = await mkdtemp(path.join(os.tmpdir(), 'tille-fm-composed-'));
  t.after(async () => { await rm(repoRoot, { recursive: true, force: true }); await rm(output, { recursive: true, force: true }); });
  const entry = ([file, text]) => ({ path: file, mode: '100644', type: 'blob', sha: fixtureBlob(repoRoot, text) });
  const files = new Map([...storageArtifacts(document()).files, ...eventSeoArtifacts(document(), sitemap).files,
    ['public/residents/data/residents.json', '{"fixture":"staging"}\n'],
    ['public/gallery/data/gallery.json', '{"fixture":"staging"}\n'],
    ['public/events/media/shared/keep.jpg', 'synthetic fixture bytes; not production media']]);
  const contentSha = fixtureCommit(repoRoot, [...files].map(entry)).commit;
  const codeSha = fixtureCommit(repoRoot, [
    ['index.html', '<p>code fixture</p>'], ['scripts/fixture.mjs', '// code'],
    ['sitemap.xml', sitemap.replaceAll('staging-only', 'MAIN-ONLY')],
    ['public/residents/data/residents.json', '{"fixture":"MAIN-ONLY"}']
  ].map(entry)).commit;
  fixtureGit(repoRoot, ['update-ref', 'refs/heads/main', codeSha]);
  fixtureGit(repoRoot, ['update-ref', 'refs/heads/content/staging', contentSha]);
  const binding = bindWriter({ environment: 'staging', mode, codeSha, contentSha, eventId: ID });
  return { repoRoot, output, binding, files };
}

async function run(f, operation, payload) {
  return prepareStagingWorkspace({ ...f, operation, eventJson: JSON.stringify(payload) });
}

function assertRefs(f) {
  assert.equal(fixtureGit(f.repoRoot, ['rev-parse', 'refs/heads/main']).toString().trim(), f.binding.codeSha);
  assert.equal(fixtureGit(f.repoRoot, ['rev-parse', 'refs/heads/content/staging']).toString().trim(), f.binding.contentSha);
}

test('upsert composes bound staging, preserves foreign sitemap and creates content-only child (not main)', async t => {
  const f = await setup(t);
  const prepared = await run(f, 'upsert', { id: ID, title: 'Updated fixture' });
  const updated = (await loadEventDocumentFromWorkspace(f.output)).events.find(e => e.id === ID);
  assert.equal(updated.title, 'Updated fixture'); assert.deepEqual(updated.future, { preserve: true });
  assert.equal(updated.imageUrl, 'public/events/media/shared/keep.jpg');
  const xml = await readFile(path.join(f.output, 'sitemap.xml'), 'utf8');
  assert.match(xml, /news\/staging-only/); assert.match(xml, /residents\/staging-only/); assert.doesNotMatch(xml, /MAIN-ONLY/);
  const head = await createContentHead({ repoRoot: f.repoRoot, binding: f.binding, prepared });
  verifyContentHead(f.repoRoot, f.binding, head, prepared.changedFiles);
  const after = validateContentCommit({ repoRoot: f.repoRoot, ...f.binding, contentSha: head });
  const before = validateContentCommit({ repoRoot: f.repoRoot, ...f.binding });
  for (const file of before.files.filter(file => !prepared.changedFiles.includes(file.path))) {
    assert.equal(after.files.find(item => item.path === file.path)?.sha, file.sha, file.path);
  }
  assert.ok(!after.files.some(file => /^(scripts|\.github|docs|tests)\//.test(file.path)));
  assertRefs(f);
});
test('remove deletes exact staging page and storage event, preserves other content and sitemap families', async t => {
  const f = await setup(t);
  const prepared = await run(f, 'remove', { id: ID });
  assert.ok(prepared.changedFiles.includes(eventOutputPath(ID))); assert.ok(prepared.changedFiles.includes('sitemap.xml'));
  assert.equal((await loadEventDocumentFromWorkspace(f.output)).events.some(e => e.id === ID), false);
  await assert.rejects(readFile(path.join(f.output, eventOutputPath(ID))), { code: 'ENOENT' });
  const head = await createContentHead({ repoRoot: f.repoRoot, binding: f.binding, prepared });
  const after = validateContentCommit({ repoRoot: f.repoRoot, ...f.binding, contentSha: head });
  assert.ok(!after.files.some(file => file.path === eventOutputPath(ID)));
  const xml = await readFile(path.join(f.output, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(xml, new RegExp(ID)); assert.match(xml, /news\/staging-only/); assert.match(xml, /residents\/staging-only/);
  assert.match(xml, /events\/unrelated/); assert.doesNotMatch(xml, /MAIN-ONLY/);
  assert.equal(await readFile(path.join(f.output, 'public/residents/data/residents.json'), 'utf8'), f.files.get('public/residents/data/residents.json'));
  assertRefs(f);
});
test('no-change does not permit an empty content commit', async t => {
  const f = await setup(t);
  const prepared = await run(f, 'upsert', { id: ID, title: 'STAGING title' });
  assert.equal(prepared.hasChanges, false); assert.deepEqual(prepared.changedFiles, []);
  await assert.rejects(createContentHead({ repoRoot: f.repoRoot, binding: f.binding, prepared }), /No content commit/);
  assertRefs(f);
});
test('validate-only materializes snapshot but never applies outputs or creates commit', async t => {
  const f = await setup(t, 'validate-only');
  const prepared = await run(f, 'remove', { id: ID });
  assert.equal(prepared.hasChanges, true);
  assert.ok((await loadEventDocumentFromWorkspace(f.output)).events.some(e => e.id === ID));
  await assert.rejects(createContentHead({ repoRoot: f.repoRoot, binding: f.binding, prepared }), /No content commit/);
  assertRefs(f);
});
test('content commit rejects changed CODE/foreign outputs', async t => {
  const f = await setup(t);
  await assert.rejects(createContentHead({ repoRoot: f.repoRoot, binding: f.binding,
    prepared: { hasChanges: true, changedFiles: ['scripts/x.mjs'], workspace: f.output } }), /CODE/);
});

test('gapped upsert fails before changing any isolated workspace output or ref', async t => {
  const f = await setup(t, 'validate-only');
  await run(f, 'remove', { id: ID });
  const paths = await readdir(f.output, { recursive: true });
  const before = await Promise.all([...f.files.keys()].map(file => readFile(path.join(f.output, file))));
  await assert.rejects(prepareFileMakerEvent({ workspaceRoot: f.output, mode: 'sync-pr', operation: 'upsert',
    eventJson: JSON.stringify({ id: ID, dates: ['2026-10-31', '2026-11-02'] }) }), /aufeinanderfolgenden/);
  assert.deepEqual(await readdir(f.output, { recursive: true }), paths);
  const after = await Promise.all([...f.files.keys()].map(file => readFile(path.join(f.output, file))));
  assert.deepEqual(after, before);
  assertRefs(f);
});

test('multi-month update and remove produce complete atomic storage/SEO diffs in fixture only', async t => {
  const f = await setup(t);
  const prepared = await run(f, 'upsert', { id: ID, dates: ['2026-10-31', '2026-11-01'] });
  for (const month of ['2026-09', '2026-10', '2026-11']) {
    assert.ok(prepared.changedFiles.includes(`public/events/data/months/${month}.json`));
  }
  assert.deepEqual(prepared.changedFiles.filter(p => p.startsWith('events/')), [eventOutputPath(ID)]);
  const updated = await loadEventDocumentFromWorkspace(f.output);
  assert.equal(updated.events.length, 2);
  assert.deepEqual(updated.events.find(e => e.id === ID).dates, ['2026-10-31', '2026-11-01']);
  const head = await createContentHead({ repoRoot: f.repoRoot, binding: f.binding, prepared });
  verifyContentHead(f.repoRoot, f.binding, head, prepared.changedFiles);
  assertRefs(f);
  const removed = await prepareFileMakerEvent({ workspaceRoot: f.output, mode: 'sync-pr', operation: 'remove',
    eventJson: JSON.stringify({ id: ID, dates: ['2026-12-31'] }) });
  for (const file of ['public/events/data/months/2026-10.json', 'public/events/data/months/2026-11.json',
    'public/events/data/event-index.json', 'public/events/data/search-index.json', eventOutputPath(ID), 'sitemap.xml']) {
    assert.ok(removed.changedFiles.includes(file), file);
  }
  await assert.rejects(readFile(path.join(f.output, eventOutputPath(ID))), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(f.output, 'public/events/data/months/2026-11.json')), { code: 'ENOENT' });
  assert.deepEqual((await loadEventDocumentFromWorkspace(f.output)).events, document().events.slice(1));
  assert.doesNotMatch(await readFile(path.join(f.output, 'sitemap.xml'), 'utf8'), new RegExp(ID));
  assertRefs(f);
});
