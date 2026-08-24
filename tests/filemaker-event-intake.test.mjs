import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildEventStorage, reconstructEventDocument, storageArtifacts } from '../public/site/js/event-storage-model.js';
import { eventOutputPath, eventPublicUrl, eventSeoArtifacts } from '../scripts/events/event-seo.mjs';
import { applyFileMakerOperation, MAX_PAYLOAD_BYTES, normalizeFileMakerId, parseFileMakerEventJson } from '../scripts/filemaker/filemaker-event-model.mjs';
import { FILEMAKER_BRANCH_PREFIX, applyEventStorage, assertAllowedEventOutputPaths, assertAllowedFileMakerOutputPaths, diffEventStorage, fileMakerBranch, isAllowedEventOutputPath, isAllowedFileMakerOutputPath, loadEventDocumentFromWorkspace, planFileMakerPullRequest, prepareFileMakerEvent } from '../scripts/filemaker/filemaker-event-intake.mjs';

const workflow = await readFile(new URL('../.github/workflows/filemaker-event-intake.yml', import.meta.url), 'utf8');
const deployWorkflow = await readFile(new URL('../.github/workflows/docker-publish.yml', import.meta.url), 'utf8');
const meetingDocs = await readFile(new URL('../docs/FILEMAKER_EVENT_INTAKE.md', import.meta.url), 'utf8');
const scriptTemplate = await readFile(new URL('../docs/filemaker/FILEMAKER_EVENT_SCRIPT_TEMPLATE.md', import.meta.url), 'utf8');
const fixture = JSON.parse(await readFile(new URL('./fixtures/filemaker-event.json', import.meta.url), 'utf8'));
const ID = fixture.id, ID2 = 'fm-11111111-2222-3333-4444-555555555555';
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.distillery.de/</loc>
  </url>
</urlset>
`;
const baseDocument = () => ({ meta: { keep: true }, events: [
  { id: 'historic-a', date: '2026-09-01', title: 'Historic A', unknown: { keep: true }, sections: [] },
  { id: ID, date: '2026-09-12', title: 'Existing FM', imageUrl: 'public/events/media/keep.jpg', sections: [{ label: 'old', genre: '', items: [] }], future: 7 },
  { id: 'historic-b', date: '2026-09-20', title: 'Historic B', sections: [] }
] });
const parse = (value = fixture, operation = 'upsert') => parseFileMakerEventJson(JSON.stringify(value), operation);
const apply = (operation, value, document = baseDocument()) => applyFileMakerOperation(document, operation, parse(value, operation));
const temp = () => mkdtemp(path.join(os.tmpdir(), 'tille-filemaker-'));
async function writeStorage(root, document) { for (const [file, content] of storageArtifacts(document).files) { const target = path.join(root, file); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, content); } }
async function writeWorkspace(root, document) {
  await writeStorage(root, document);
  for (const [file, content] of eventSeoArtifacts(document, SITEMAP).files) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

test('valid fm UUID accepted', () => assert.equal(normalizeFileMakerId(ID), ID));
test('uppercase UUID normalized lowercase', () => assert.equal(normalizeFileMakerId(ID.toUpperCase()), ID));
test('missing id rejected', () => assert.throws(() => parse({ date: '2026-01-01', title: 'X' }), /ID fehlt/));
test('malformed fm id rejected', () => assert.throws(() => parse({ ...fixture, id: 'fm-nope' }), /fm-<uuid>/));
test('ra id rejected', () => assert.throws(() => parse({ ...fixture, id: 'ra-123' }), /fm-<uuid>/));
test('historical slug id rejected', () => assert.throws(() => parse({ ...fixture, id: 'old-event' }), /fm-<uuid>/));
test('missing date on new upsert rejected', () => assert.throws(() => apply('upsert', { id: ID2, title: 'X' }), /date und title/));
test('invalid date rejected', () => assert.throws(() => parse({ ...fixture, date: '12.09.2026' }), /Format/));
test('impossible date rejected', () => assert.throws(() => parse({ ...fixture, date: '2026-02-30' }), /real existierendes/));
test('empty title rejected', () => assert.throws(() => parse({ ...fixture, title: ' ' }), /nicht leer/));
test('oversized payload rejected', () => assert.throws(() => parseFileMakerEventJson(JSON.stringify({ ...fixture, description: 'x'.repeat(MAX_PAYLOAD_BYTES) })), /40 KB/));
test('data URL rejected', () => assert.throws(() => parse({ ...fixture, imageUrl: 'data:image/png,x' }), /verbotenen/));
test('Base64 rejected', () => assert.throws(() => parse({ ...fixture, description: 'x;base64,AAAA' }), /verbotenen/));
test('javascript URL rejected', () => assert.throws(() => parse({ ...fixture, moreUrl: 'javascript:x' }), /verbotenen/));
test('blob URL rejected', () => assert.throws(() => parse({ ...fixture, moreUrl: 'blob:x' }), /verbotenen/));
test('traversal image path rejected', () => assert.throws(() => parse({ ...fixture, imageUrl: 'public/events/media/../../x' }), /unsicheren/));
test('filesystem image path rejected', () => assert.throws(() => parse({ ...fixture, imageUrl: 'C:\\tmp\\x.jpg' }), /HTTP oder HTTPS/));
test('valid external HTTPS URL accepted', () => assert.equal(parse({ ...fixture, imageUrl: 'https://img.example/x.jpg' }).imageUrl, 'https://img.example/x.jpg'));
test('valid external HTTP URL accepted', () => assert.equal(parse({ ...fixture, imageUrl: 'http://img.example/x.jpg' }).imageUrl, 'http://img.example/x.jpg'));
test('valid public events media path accepted', () => assert.equal(parse({ ...fixture, imageUrl: 'public/events/media/x/y.jpg' }).imageUrl, 'public/events/media/x/y.jpg'));
test('URL credentials rejected', () => assert.throws(() => parse({ ...fixture, moreUrl: 'https://user:pass@example.test' }), /Zugangsdaten/));
test('Unicode artist and title preserved', () => { const out = parse({ ...fixture, title: 'Grüße 東京', sections: [{ label: 'ü:', items: [{ name: 'Änne 東京' }] }] }); assert.equal(out.title, 'Grüße 東京'); assert.equal(out.sections[0].items[0].name, 'Änne 東京'); });
test('line breaks in descriptions preserved', () => assert.equal(parse({ ...fixture, description: 'A\nB' }).description, 'A\nB'));
test('control garbage rejected', () => assert.throws(() => parse({ ...fixture, description: 'A\u0000B' }), /Steuerzeichen/));
test('script payload rejected', () => assert.throws(() => parse({ ...fixture, description: '<script>x</script>' }), /verbotenen/));
test('iframe payload rejected', () => assert.throws(() => parse({ ...fixture, title: '<iframe>' }), /verbotenen/));
test('form payload rejected', () => assert.throws(() => parse({ ...fixture, description: '<form>' }), /verbotenen/));
test('common token pattern rejected', () => assert.throws(() => parse({ ...fixture, description: `token ${'ghp_' + 'a'.repeat(30)}` }), /Secret/));
test('sections must be array', () => assert.throws(() => parse({ ...fixture, sections: {} }), /Array/));
test('section must be object', () => assert.throws(() => parse({ ...fixture, sections: ['x'] }), /Objekt/));
test('items must be array', () => assert.throws(() => parse({ ...fixture, sections: [{ items: {} }] }), /Array/));
test('item must be object', () => assert.throws(() => parse({ ...fixture, sections: [{ items: ['x'] }] }), /Objekt/));
test('section count bounded', () => assert.throws(() => parse({ ...fixture, sections: Array(21).fill({}) }), /zu viele/));
test('item count bounded', () => assert.throws(() => parse({ ...fixture, sections: [{ items: Array(101).fill({}) }] }), /zu viele/));
test('unexpected nested field rejected', () => assert.throws(() => parse({ ...fixture, sections: [{ surprise: {} }] }), /Section-Feld/));

test('new fm event created', () => assert.equal(apply('upsert', { id: ID2, date: '2026-09-15', title: 'New' }).action, 'created'));
test('same ID does not duplicate', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.filter(e => e.id === ID).length, 1));
test('existing fm event updates', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.find(e => e.id === ID).title, 'Updated'));
test('non-fm event cannot update', () => assert.throws(() => parse({ id: 'historic-a', title: 'X' }), /fm-<uuid>/));
test('unknown existing fields preserved', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.find(e => e.id === ID).future, 7));
test('omitted imageUrl preserved', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.find(e => e.id === ID).imageUrl, 'public/events/media/keep.jpg'));
test('explicit empty imageUrl clears', () => assert.equal(apply('upsert', { id: ID, imageUrl: '' }).document.events.find(e => e.id === ID).imageUrl, ''));
test('omitted sections preserved', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.find(e => e.id === ID).sections[0].label, 'old'));
test('supplied sections replace', () => assert.equal(apply('upsert', { id: ID, sections: [{ label: 'new', items: [] }] }).document.events.find(e => e.id === ID).sections[0].label, 'new'));
test('date unchanged preserves position', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.findIndex(e => e.id === ID), 1));
test('date changed moves correctly', () => assert.equal(apply('upsert', { id: ID, date: '2026-09-25' }).document.events.at(-1).id, ID));
test('same-date insertion is after existing date', () => { const out = apply('upsert', { id: ID2, date: '2026-09-20', title: 'New' }).document.events; assert.ok(out.findIndex(e => e.id === ID2) > out.findIndex(e => e.id === 'historic-b')); });
test('default color orange', () => assert.equal(apply('upsert', { id: ID2, date: '2026-09-15', title: 'New' }).document.events.find(e => e.id === ID2).color, 'orange'));
test('default sections empty', () => assert.deepEqual(apply('upsert', { id: ID2, date: '2026-09-15', title: 'New' }).document.events.find(e => e.id === ID2).sections, []));
test('default optional strings empty', () => { const e = apply('upsert', { id: ID2, date: '2026-09-15', title: 'New' }).document.events.find(e => e.id === ID2); assert.equal(e.moreUrl, ''); assert.equal(e.description, ''); });
test('ID remains immutable', () => assert.equal(apply('upsert', { id: ID, title: 'Updated' }).document.events.find(e => e.id === ID).id, ID));
test('input document is not mutated', () => { const doc = baseDocument(), copy = structuredClone(doc); apply('upsert', { id: ID, title: 'Updated' }, doc); assert.deepEqual(doc, copy); });

test('existing fm event removed', () => assert.equal(apply('remove', { id: ID }).document.events.some(e => e.id === ID), false));
test('missing fm event remove is idempotent no-op', () => assert.equal(apply('remove', { id: ID2 }).action, 'no-op'));
test('ra event remove rejected', () => assert.throws(() => parse({ id: 'ra-123' }, 'remove'), /fm-<uuid>/));
test('historical event remove rejected', () => assert.throws(() => parse({ id: 'historic-a' }, 'remove'), /fm-<uuid>/));
test('remove payload needs only ID', () => assert.deepEqual(parse({ id: ID }, 'remove'), { id: ID }));
test('removed ID absent from event index', () => assert.equal(buildEventStorage(apply('remove', { id: ID }).document).eventIndex.events.some(e => e.id === ID), false));
test('removed ID absent from search index', () => assert.equal(buildEventStorage(apply('remove', { id: ID }).document).searchIndex.events.some(e => e.id === ID), false));

test('manifest regenerated', () => assert.equal(storageArtifacts(apply('upsert', { id: ID, title: 'Changed' }).document).files.has('public/events/data/manifest.json'), true));
test('meta regenerated', () => assert.equal(storageArtifacts(baseDocument()).files.has('public/events/data/meta.json'), true));
test('event index regenerated', () => assert.equal(storageArtifacts(baseDocument()).files.has('public/events/data/event-index.json'), true));
test('search index regenerated', () => assert.equal(storageArtifacts(baseDocument()).files.has('public/events/data/search-index.json'), true));
test('correct month file generated', () => assert.equal(storageArtifacts(baseDocument()).files.has('public/events/data/months/2026-09.json'), true));
test('old month updated after date move', () => { const doc = { meta: {}, events: [{ ...fixture, date: '2026-08-01' }] }; const out = applyFileMakerOperation(doc, 'upsert', parse({ id: ID, date: '2026-09-01' })); assert.equal(buildEventStorage(out.document).months.has('2026-08'), false); });
test('new month updated after date move', () => { const doc = { meta: {}, events: [{ ...fixture, date: '2026-08-01' }] }; const out = applyFileMakerOperation(doc, 'upsert', parse({ id: ID, date: '2026-09-01' })); assert.equal(buildEventStorage(out.document).months.has('2026-09'), true); });
test('reconstruct equals intended document', () => { const doc = apply('upsert', { id: ID, title: 'Changed' }).document; assert.deepEqual(reconstructEventDocument(buildEventStorage(doc)), doc); });
test('duplicate ID collision rejected', () => assert.throws(() => buildEventStorage({ events: [{ ...fixture }, { ...fixture }] }), /Kollision/));
test('unchanged historical events preserve value integrity', () => { const before = baseDocument(); const after = apply('upsert', { id: ID, title: 'Changed' }, before).document; assert.deepEqual(after.events.filter(e => !e.id.startsWith('fm-')), before.events.filter(e => !e.id.startsWith('fm-'))); });
test('empty target month is removed from applied workspace', async () => { const root = await temp(); try { const doc = { meta: {}, events: [{ ...fixture }] }; await writeWorkspace(root, doc); await prepareFileMakerEvent({ mode: 'sync-pr', operation: 'remove', eventJson: JSON.stringify({ id: ID }), workspaceRoot: root }); await assert.rejects(readFile(path.join(root, 'public/events/data/months/2026-09.json'))); } finally { await rm(root, { recursive: true, force: true }); } });
test('workspace reconstruction uses manifest monthly data', async () => { const root = await temp(); try { const doc = baseDocument(); await writeStorage(root, doc); assert.deepEqual(await loadEventDocumentFromWorkspace(root), doc); } finally { await rm(root, { recursive: true, force: true }); } });
test('upsert updates storage and exactly the affected static Event page', async () => { const root = await temp(); try { const doc = baseDocument(); await writeWorkspace(root, doc); const unrelated = eventOutputPath('historic-a'), before = await readFile(path.join(root, unrelated), 'utf8'); const out = await prepareFileMakerEvent({ mode: 'sync-pr', operation: 'upsert', eventJson: JSON.stringify({ id: ID, title: 'Changed for SEO' }), workspaceRoot: root }); assert.equal(out.eventPage, eventOutputPath(ID)); assert.equal(out.eventPageChanged, true); assert.equal(out.changedFiles.includes(eventOutputPath(ID)), true); assert.match(await readFile(path.join(root, eventOutputPath(ID)), 'utf8'), /Changed for SEO/); assert.equal(await readFile(path.join(root, unrelated), 'utf8'), before); } finally { await rm(root, { recursive: true, force: true }); } });
test('new upsert adds the static page and Event sitemap URL together', async () => { const root = await temp(); try { const doc = baseDocument(); await writeWorkspace(root, doc); const out = await prepareFileMakerEvent({ mode: 'sync-pr', operation: 'upsert', eventJson: JSON.stringify({ id: ID2, date: '2026-10-01', title: 'New SEO Event' }), workspaceRoot: root }); assert.equal(out.sitemapChanged, true); assert.deepEqual(out.changedFiles.filter(file => file === eventOutputPath(ID2) || file === 'sitemap.xml'), [eventOutputPath(ID2), 'sitemap.xml']); assert.match(await readFile(path.join(root, eventOutputPath(ID2)), 'utf8'), /New SEO Event/); assert.match(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), new RegExp(eventPublicUrl(ID2))); } finally { await rm(root, { recursive: true, force: true }); } });
test('remove deletes the affected static page and Event sitemap URL together', async () => { const root = await temp(); try { const doc = baseDocument(); await writeWorkspace(root, doc); const out = await prepareFileMakerEvent({ mode: 'sync-pr', operation: 'remove', eventJson: JSON.stringify({ id: ID }), workspaceRoot: root }); assert.equal(out.eventPageChanged, true); assert.equal(out.sitemapChanged, true); await assert.rejects(readFile(path.join(root, eventOutputPath(ID)))); assert.doesNotMatch(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), new RegExp(eventPublicUrl(ID))); } finally { await rm(root, { recursive: true, force: true }); } });
test('storage no-op repairs a missing affected Event page without touching other pages', async () => { const root = await temp(); try { const doc = baseDocument(); await writeWorkspace(root, doc); const unrelated = eventOutputPath('historic-b'), before = await readFile(path.join(root, unrelated), 'utf8'); await rm(path.join(root, eventOutputPath(ID))); const out = await prepareFileMakerEvent({ mode: 'sync-pr', operation: 'upsert', eventJson: JSON.stringify({ id: ID }), workspaceRoot: root }); assert.equal(out.hasChanges, true); assert.deepEqual(out.changedFiles, [eventOutputPath(ID)]); assert.match(await readFile(path.join(root, eventOutputPath(ID)), 'utf8'), /Existing FM/); assert.equal(await readFile(path.join(root, unrelated), 'utf8'), before); } finally { await rm(root, { recursive: true, force: true }); } });
test('validate-only does not mutate storage Event page or sitemap', async () => { const root = await temp(); try { const doc = baseDocument(); await writeWorkspace(root, doc); const files = ['public/events/data/months/2026-09.json', eventOutputPath(ID), 'sitemap.xml']; const before = new Map(await Promise.all(files.map(async file => [file, await readFile(path.join(root, file), 'utf8')]))); const out = await prepareFileMakerEvent({ mode: 'validate-only', operation: 'upsert', eventJson: JSON.stringify({ id: ID, title: 'Changed' }), workspaceRoot: root }); assert.equal(out.hasChanges, true); for (const file of files) assert.equal(await readFile(path.join(root, file), 'utf8'), before.get(file)); } finally { await rm(root, { recursive: true, force: true }); } });
test('missing sitemap fails before storage mutation', async () => { const root = await temp(); try { const doc = baseDocument(); await writeStorage(root, doc); const file = path.join(root, 'public/events/data/months/2026-09.json'), before = await readFile(file, 'utf8'); await assert.rejects(() => prepareFileMakerEvent({ mode: 'sync-pr', operation: 'upsert', eventJson: JSON.stringify({ id: ID, title: 'Changed' }), workspaceRoot: root }), /sitemap\.xml fehlt/); assert.equal(await readFile(file, 'utf8'), before); } finally { await rm(root, { recursive: true, force: true }); } });

test('workflow dispatch only', () => { assert.match(workflow, /\non:\n  workflow_dispatch:/); assert.doesNotMatch(workflow, /\n  (push|schedule|repository_dispatch|workflow_run):/); });
test('mode choices present', () => { assert.match(workflow, /validate-only/); assert.match(workflow, /sync-pr/); });
test('operation choices present', () => { assert.match(workflow, /options: \[upsert, remove\]/); });
test('event json required', () => assert.match(workflow, /event_json:\n        required: true/));
test('concurrency present', () => assert.match(workflow, /group: filemaker-event-intake/));
test('validate-only contents read only', () => assert.match(workflow, /validate-only:[\s\S]*?permissions:\n      contents: read/));
test('sync-pr has only required write permissions', () => assert.match(workflow, /sync-pr:[\s\S]*?permissions:\n      contents: write\n      pull-requests: write\n      actions: write/));
test('no push trigger', () => assert.doesNotMatch(workflow, /\n  push:/));
test('no schedule trigger', () => assert.doesNotMatch(workflow, /\n  schedule:/));
test('no repository dispatch', () => assert.doesNotMatch(workflow, /repository_dispatch/));
test('FileMaker workflow contains no direct deployment implementation', () => {
  const workflowWithoutAllowedDispatch = workflow.replace(/gh workflow run docker-publish\.yml[^\n]*/, '');
  assert.doesNotMatch(workflowWithoutAllowedDispatch, /\b(?:docker|kubectl|ssh)\b|appleboy\/ssh-action|docker\/build-push-action/i);
});
test('no generic auto merge command', () => assert.doesNotMatch(workflow, /gh pr merge|enable-auto-merge|enablePullRequestAutoMerge/));
test('no PAT input', () => assert.doesNotMatch(workflow.split('\nconcurrency:')[0], /pat:|token:/i));
test('event json passed through environment', () => assert.match(workflow, /FILEMAKER_EVENT_JSON: \$\{\{ inputs\.event_json \}\}/));
test('event json not interpolated into shell', () => assert.doesNotMatch(workflow, /run:.*inputs\.event_json/));
test('token is never echoed', () => assert.doesNotMatch(workflow, /echo.*GH_TOKEN/));
test('no additional FileMaker credential or secret is introduced', () => assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.|\bPAT\b|id-token:|administration:|packages:|issues:/i));

test('branch derived from validated ID', () => assert.equal(fileMakerBranch(ID), `${FILEMAKER_BRANCH_PREFIX}${ID}`));
test('zero open FileMaker PR creates', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID }).action, 'create-pr'));
test('same event open PR updates', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, openPullRequests: [{ number: 1, base: 'main', head: fileMakerBranch(ID) }] }).action, 'update-pr'));
test('different event open PR hard fails', () => assert.throws(() => planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, openPullRequests: [{ number: 2, base: 'main', head: fileMakerBranch(ID2) }] }), /Another FileMaker/));
test('duplicate same-event PRs hard fail', () => assert.throws(() => planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, openPullRequests: [{ number: 1, base: 'main', head: fileMakerBranch(ID) }, { number: 2, base: 'main', head: fileMakerBranch(ID) }] }), /More than one/));
test('different-base PR ignored', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, openPullRequests: [{ number: 2, base: 'dev', head: fileMakerBranch(ID2) }] }).action, 'create-pr'));
test('PR base is main', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID }).base, 'main'));
test('new PR remains draft', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID }).draft, true));
test('existing same event has one update intention', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, openPullRequests: [{ number: 1, base: 'main', head: fileMakerBranch(ID) }] }).prNumber, 1));
test('main moved hard fails', () => assert.throws(() => planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: true, eventId: ID, baseMoved: true }), /main moved/));
test('force with lease only', () => { assert.match(workflow, /git push --force-with-lease/); assert.doesNotMatch(workflow, /git push --force(?:\s|$)/); });
test('no force push to main', () => assert.doesNotMatch(workflow, /git push[^\n]*main/));
test('no change no PR means no mutation', () => assert.deepEqual(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: false, eventId: ID }), { action: 'none', write: false }));
test('no change same event PR closes', () => assert.equal(planFileMakerPullRequest({ mode: 'sync-pr', hasChanges: false, eventId: ID, openPullRequests: [{ number: 1, base: 'main', head: fileMakerBranch(ID) }] }).action, 'close-pr'));
test('stale close occurs before optional comment', () => { const block = workflow.split('- name: Close stale same-event PR')[1].split('- name: Report no changes')[0]; assert.ok(block.indexOf('gh pr close') < block.indexOf('gh pr comment')); });
test('comment failure cannot block close', () => assert.match(workflow.split('- name: Close stale same-event PR')[1], /gh pr comment[^\n]+\|\| true/));
test('no branch delete', () => assert.doesNotMatch(workflow, /git branch.*-[dD]|--delete-branch/));
test('no merge command', () => assert.doesNotMatch(workflow, /gh pr merge/));
test('validate-only plan remains read-only', () => assert.deepEqual(planFileMakerPullRequest({ mode: 'validate-only', hasChanges: true, eventId: ID, openPullRequests: [{ number: 1, base: 'main', head: fileMakerBranch(ID) }] }), { action: 'none', write: false }));
test('main moved gate precedes commit step', () => assert.ok(workflow.indexOf('Verify main has not moved') < workflow.indexOf('Commit controlled event storage and SEO')));
test('different PR gate precedes commit step', () => assert.ok(workflow.indexOf('Enforce single FileMaker PR') < workflow.indexOf('Commit controlled event storage and SEO')));
test('existing PR forced back to Draft', () => assert.match(workflow, /gh pr ready "\$PR_NUMBER" --undo/));
test('auto merge branch is restricted to exact FileMaker event branch', () => assert.match(workflow, /case "\$EVENT_BRANCH" in automation\/filemaker-event\/\*\)/));
test('created or updated PR number is determined uniquely', () => { assert.match(workflow, /gh pr list --state open --base main --head "\$EVENT_BRANCH" --limit 2/); assert.match(workflow, /Expected exactly one open PR/); assert.match(workflow, /echo "number=\$number" >> "\$GITHUB_OUTPUT"/); });
test('fresh PR gate requires open state and main base', () => { assert.match(workflow, /gh api "repos\/\$GITHUB_REPOSITORY\/pulls\/\$PR_NUMBER"/); assert.match(workflow, /jq -r \.state[\s\S]*?= open/); assert.match(workflow, /jq -r \.base\.ref[\s\S]*?= main/); });
test('fresh PR gate requires exact event branch and generated head SHA', () => { assert.match(workflow, /jq -r \.head\.ref[\s\S]*?"\$EVENT_BRANCH"/); assert.match(workflow, /jq -r \.head\.sha[\s\S]*?"\$EVENT_HEAD_SHA"/); assert.match(workflow, /head_sha=\$\(git rev-parse HEAD\)/); });
test('fresh changed files are fetched from GitHub immediately before Ready', () => assert.match(workflow, /gh api --paginate "repos\/\$GITHUB_REPOSITORY\/pulls\/\$PR_NUMBER\/files\?per_page=100" --jq '\.\[\]\.filename'/));
test('fresh changed files retain the strict storage Event-page and sitemap allowlist', () => { assert.match(workflow, /sitemap\.xml\|"\$EVENT_PAGE"/); assert.match(workflow, /public\/events\/data\/months\/\*\.json/); assert.match(workflow, /\^public\/events\/data\/months\/\[0-9\]\{4\}-\(0\[1-9\]\|1\[0-2\]\)\\\.json\$/); });
test('main is fetched and checked immediately before Ready and merge', () => { const checks = workflow.match(/git fetch origin main[\s\S]*?git rev-parse origin\/main/g) || []; assert.ok(checks.length >= 3); assert.match(workflow, /main moved immediately before FileMaker merge/); });
test('Draft becomes Ready only after all first-pass gates', () => assert.ok(workflow.indexOf('Verify FileMaker PR and changed files before Ready') < workflow.indexOf('Mark verified FileMaker PR Ready for Review')));
test('PR is freshly reverified after Ready', () => { assert.ok(workflow.indexOf('Mark verified FileMaker PR Ready for Review') < workflow.indexOf('Reverify and merge exact FileMaker PR')); const block = workflow.split('- name: Reverify and merge exact FileMaker PR')[1]; for (const field of ['.number','.state','.base.ref','.head.ref','.head.sha']) assert.match(block, new RegExp(field.replaceAll('.', '\\\.'))); });
test('merge REST request includes exact expected head SHA', () => assert.match(workflow, /gh api --method PUT "repos\/\$GITHUB_REPOSITORY\/pulls\/\$PR_NUMBER\/merge" -f merge_method=merge -f sha="\$EVENT_HEAD_SHA"/));
test('merge response must be merged and yield a SHA output', () => { assert.match(workflow, /jq -r '\.merged \/\/ false'[\s\S]*?= true/); assert.match(workflow, /merge_sha="\$\(jq -r '\.sha \/\/ empty'/); assert.match(workflow, /echo "merge_sha=\$merge_sha" >> "\$GITHUB_OUTPUT"/); });
test('origin main must equal merge SHA before deploy dispatch', () => { const verify = workflow.indexOf('Verify merged FileMaker SHA on main'), dispatch = workflow.indexOf('Dispatch SHA-gated staging deployment'); assert.ok(verify >= 0 && verify < dispatch); assert.match(workflow.slice(verify, dispatch), /"\$MERGE_SHA" = "\$\(git rev-parse origin\/main\)"/); });
test('docker publish is explicitly dispatched on main with merge SHA', () => assert.match(workflow, /gh workflow run docker-publish\.yml --ref main -f expected_sha="\$MERGE_SHA"/));
test('all merge and deploy steps require real changes', () => { for (const name of ['Verify FileMaker PR and changed files before Ready','Mark verified FileMaker PR Ready for Review','Reverify and merge exact FileMaker PR','Verify merged FileMaker SHA on main','Dispatch SHA-gated staging deployment']) { const block = workflow.split(`- name: ${name}`)[1]; assert.match(block, /if: steps\.intake\.outputs\.has_changes == 'true'/); } });
test('docker workflow has optional expected SHA dispatch input', () => assert.match(deployWorkflow, /workflow_dispatch:\n    inputs:\n      expected_sha:\n[\s\S]*?required: false\n        type: string/));
test('expected SHA gate occurs before build login push and deploy', () => { const gate = deployWorkflow.indexOf('Verify expected deployment SHA'); assert.ok(gate > deployWorkflow.indexOf('actions/checkout@v4')); for (const later of ['docker/setup-qemu-action','Log in to GHCR','Build and push','deploy:']) assert.ok(gate < deployWorkflow.indexOf(later)); assert.match(deployWorkflow, /git rev-parse HEAD[\s\S]*?"\$EXPECTED_SHA"/); });
test('normal docker push trigger on main remains present', () => assert.match(deployWorkflow, /  push:\r?\n    branches: \[main\]/));

for (const file of ['manifest.json', 'meta.json', 'event-index.json', 'search-index.json']) test(`${file} allowed`, () => assert.equal(isAllowedEventOutputPath(`public/events/data/${file}`), true));
test('YYYY-MM month allowed', () => assert.equal(isAllowedEventOutputPath('public/events/data/months/2026-09.json'), true));
test('only the exact FileMaker Event page and sitemap are added to the output allowlist', () => { assert.equal(isAllowedFileMakerOutputPath(eventOutputPath(ID), ID), true); assert.equal(isAllowedFileMakerOutputPath('sitemap.xml', ID), true); assert.equal(isAllowedFileMakerOutputPath(eventOutputPath(ID2), ID), false); assert.throws(() => assertAllowedFileMakerOutputPaths(['events/other/index.html'], ID), /not allowed/); });
for (const [label, file] of [
  ['residents', 'public/residents/data/residents.json'], ['gallery', 'public/gallery/data/gallery.json'],
  ['site navigation', 'public/site/data/site-navigation.json'], ['tracking', 'assets/tracking.js'],
  ['event media', 'public/events/media/x.jpg'], ['event HTML', 'event.html'],
  ['workflow', '.github/workflows/x.yml'], ['docs', 'docs/x.md']
]) test(`${label} path rejected`, () => assert.throws(() => assertAllowedEventOutputPaths([file]), /not allowed/));
test('invalid month rejected', () => assert.equal(isAllowedEventOutputPath('public/events/data/months/2026-13.json'), false));
test('storage diff detects added file', () => assert.equal(diffEventStorage(new Map(), new Map([['public/events/data/manifest.json', 'x']])).hasChanges, true));
test('storage diff detects unchanged files', () => assert.equal(diffEventStorage(new Map([['public/events/data/manifest.json', 'x']]), new Map([['public/events/data/manifest.json', 'x']])).hasChanges, false));
test('storage diff ignores checkout line endings', () => assert.equal(diffEventStorage(new Map([['public/events/data/manifest.json', 'x\r\n']]), new Map([['public/events/data/manifest.json', 'x\n']])).hasChanges, false));

test('script template explicitly verifies SSL certificates', () => assert.match(scriptTemplate, /Insert from URL \[[^\]]*Verify SSL Certificates/));
test('error snapshot occurs immediately after Insert from URL', () => assert.match(scriptTemplate, /Insert from URL \[[\s\S]*?cURL options: \$curl \]\n\nSet Variable \[ \$errorSnapshot/));
test('no variable step exists between Insert from URL and error snapshot', () => {
  const between = scriptTemplate.slice(scriptTemplate.indexOf('Insert from URL'), scriptTemplate.indexOf('Set Variable [ $errorSnapshot'));
  assert.doesNotMatch(between, /Set Variable/);
});
test('UUID creation is committed before dispatch', () => {
  const setId = scriptTemplate.indexOf('Set Field [ Events::WebsiteEventID');
  const commit = scriptTemplate.indexOf('Commit Records/Requests', setId);
  const dispatch = scriptTemplate.indexOf('Insert from URL');
  assert.ok(setId >= 0 && setId < commit && commit < dispatch);
});
test('failed UUID commit exits before dispatch', () => {
  const commit = scriptTemplate.indexOf('Commit Records/Requests');
  const exit = scriptTemplate.indexOf('Exit Script [ Text Result: "error" ]', commit);
  assert.ok(commit >= 0 && commit < exit && exit < scriptTemplate.indexOf('Insert from URL'));
});
test('API version remains 2026-03-10', () => assert.match(scriptTemplate, /X-GitHub-Api-Version: 2026-03-10/));
test('meeting docs describe current HTTP 200 response', () => assert.match(meetingDocs, /HTTP 200/));
test('workflow run id is documented and stored', () => { assert.match(meetingDocs, /workflow_run_id/); assert.match(scriptTemplate, /WebsiteLastRunID/); });
test('HTML run URL is documented and stored', () => { assert.match(meetingDocs, /html_url/); assert.match(scriptTemplate, /WebsiteLastRunURL/); });
test('outdated HTTP 204 without run id wording is absent', () => assert.doesNotMatch(meetingDocs, /HTTP 204 ohne Run-ID/));
test('response is validated before success dialog', () => assert.ok(scriptTemplate.indexOf('IsEmpty ( $workflowRunID )') < scriptTemplate.indexOf('GitHub-Workflow wurde gestartet.')));
