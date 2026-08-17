import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  AUTOMATION_BRANCH, applyNewsOutput, assertAllowedNewsOutputPaths, assertNewsOutputContentSafe, diffNewsOutput,
  isAllowedNewsOutputPath, planNewsSync, readNewsOutput, validateWordPressBaseUrl
} from '../scripts/news/news-sync.mjs';
import { prepareNewsSync } from '../scripts/news/prepare-sync.mjs';

const workflow = await readFile(new URL('../.github/workflows/wordpress-news-sync.yml', import.meta.url), 'utf8');
const fixtures = JSON.parse(await readFile(new URL('./fixtures/wordpress-posts.json', import.meta.url), 'utf8'));
const output = (articles = {}) => new Map([
  ['news.html', 'legacy'], ['news/index.html', 'overview'],
  ...Object.entries(articles).map(([slug, html]) => [`news/${slug}/index.html`, html])
]);
const response = data => ({ ok: true, status: 200, headers: { get: () => '1' }, json: async () => data });

test('new post is added', () => assert.deepEqual(diffNewsOutput(output(), output({ 'new-post': 'x' })).added, ['new-post']));
test('changed post is updated', () => assert.deepEqual(diffNewsOutput(output({ post: 'a' }), output({ post: 'b' })).updated, ['post']));
test('removed post is removed', () => assert.deepEqual(diffNewsOutput(output({ old: 'a' }), output()).removed, ['old']));
test('unchanged output has no changes', () => assert.equal(diffNewsOutput(output({ post: 'a' }), output({ post: 'a' })).hasChanges, false));
test('overview change is detected', () => { const next = output(); next.set('news/index.html', 'new'); assert.equal(diffNewsOutput(output(), next).overviewChanged, true); });
test('legacy change is detected', () => { const next = output(); next.set('news.html', 'new'); assert.equal(diffNewsOutput(output(), next).legacyChanged, true); });
test('non-news path is rejected by diff', () => assert.throws(() => diffNewsOutput(output(), { 'index.html': 'x' }), /not allowed/));

test('workflow_dispatch is the only trigger', () => { assert.match(workflow, /\non:\n  workflow_dispatch:/); assert.doesNotMatch(workflow, /\n  (?:push|schedule|repository_dispatch):/); });
test('workflow has no push trigger', () => assert.doesNotMatch(workflow, /\n  push:/));
test('workflow has no schedule trigger', () => assert.doesNotMatch(workflow, /\n  schedule:/));
test('workflow serializes syncs', () => assert.match(workflow, /group: wordpress-news-sync/));
test('validate job has read-only contents permission', () => assert.match(workflow, /validate-only:[\s\S]*?permissions:\n      contents: read/));
test('write job has only required write permissions', () => assert.match(workflow, /sync-pr:[\s\S]*?permissions:\n      contents: write\n      pull-requests: write/));
test('WordPress URL comes from repository variable', () => assert.match(workflow, /vars\.WORDPRESS_BASE_URL/));
test('validate-only job contains no commit or PR command', () => { const block = workflow.split('\n  sync-pr:')[0]; assert.doesNotMatch(block, /git (?:commit|push)|gh pr/); });
test('sync-pr is the only write variant', () => { assert.match(workflow, /if: inputs\.mode == 'sync-pr'/); assert.equal((workflow.match(/contents: write/g) || []).length, 1); });
test('created PR is draft', () => assert.match(workflow, /gh pr create --draft/));
test('workflow has no auto merge', () => assert.doesNotMatch(workflow, /gh pr merge|enable-auto-merge/));
test('workflow has no deployment step', () => assert.doesNotMatch(workflow, /deploy|docker (?:build|push)|kubectl/i));

test('missing WordPress URL fails clearly', () => assert.throws(() => validateWordPressBaseUrl(''), /is not configured/));
test('malformed WordPress URL fails', () => assert.throws(() => validateWordPressBaseUrl('not a url'), /malformed/));
test('non-http WordPress URL fails', () => assert.throws(() => validateWordPressBaseUrl('file:///tmp/cms'), /HTTP or HTTPS/));
test('valid WordPress URL is normalized', () => assert.equal(validateWordPressBaseUrl('https://cms.example/'), 'https://cms.example'));
test('WordPress URL credentials are rejected', () => assert.throws(() => validateWordPressBaseUrl('https://user:pass@cms.example'), /credentials/));
test('mock REST source generates successfully', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-sync-test-'));
  try { const result = await prepareNewsSync({ mode: 'validate-only', workspaceRoot: root, wordpressBaseUrl: 'https://cms.example', fetchImpl: async () => response(fixtures) }); assert.equal(result.articleCount, 3); }
  finally { await rm(root, { recursive: true, force: true }); }
});
test('source-origin filtering remains active', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-sync-origin-'));
  const source = structuredClone(fixtures[0]); source.content.rendered = '<a href="https://cms.example/internal">internal</a>';
  try { await prepareNewsSync({ mode: 'sync-pr', workspaceRoot: root, wordpressBaseUrl: 'https://cms.example', fetchImpl: async () => response([source]) }); assert.doesNotMatch(await readFile(path.join(root, 'news', source.slug, 'index.html'), 'utf8'), /href="https:\/\/cms\.example/); }
  finally { await rm(root, { recursive: true, force: true }); }
});
test('published-only behavior remains active', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-sync-publish-'));
  try { const result = await prepareNewsSync({ mode: 'validate-only', workspaceRoot: root, wordpressBaseUrl: 'https://cms.example', fetchImpl: async () => response(fixtures) }); assert.equal(result.normalizedPosts, 3); }
  finally { await rm(root, { recursive: true, force: true }); }
});

test('news overview path is accepted', () => assert.equal(isAllowedNewsOutputPath('news/index.html'), true));
test('news article path is accepted', () => assert.equal(isAllowedNewsOutputPath('news/safe-slug/index.html'), true));
test('residents path is rejected', () => assert.throws(() => assertAllowedNewsOutputPaths(['public/residents/data/residents.json']), /not allowed/));
test('events path is rejected', () => assert.throws(() => assertAllowedNewsOutputPaths(['public/events/data/event-index.json']), /not allowed/));
test('site navigation path is rejected', () => assert.throws(() => assertAllowedNewsOutputPaths(['public/site/data/site-navigation.json']), /not allowed/));
test('tracking path is rejected', () => assert.throws(() => assertAllowedNewsOutputPaths(['assets/tracking.js']), /not allowed/));
test('arbitrary root HTML is rejected', () => assert.equal(isAllowedNewsOutputPath('index.html'), false));
test('unsafe article slug path is rejected', () => assert.equal(isAllowedNewsOutputPath('news/../index.html'), false));
test('generated data URL is rejected', () => assert.throws(() => assertNewsOutputContentSafe(output({ post: '<img src="data:image/png;base64,x">' })), /Unsafe URL/));
test('generated blob URL is rejected', () => assert.throws(() => assertNewsOutputContentSafe(output({ post: '<a href="blob:x">x</a>' })), /Unsafe URL/));
test('generated token pattern is rejected without logging it', () => assert.throws(() => assertNewsOutputContentSafe(output({ post: `token ${'ghp_' + 'a'.repeat(30)}` })), /Possible secret/));

test('no changes plan performs no write', () => assert.deepEqual(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: false } }), { action: 'none', write: false }));
test('validate-only plan performs no write despite changes', () => assert.equal(planNewsSync({ mode: 'validate-only', diff: { hasChanges: true } }).write, false));
test('changes target automation branch', () => assert.equal(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: true } }).branch, AUTOMATION_BRANCH));
test('existing automation PR selects update path', () => assert.equal(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: true }, existingPrNumber: 42 }).action, 'update-pr'));
test('new automation PR selects one create path', () => assert.equal(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: true } }).action, 'create-pr'));
test('sync PR always targets main', () => assert.equal(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: true } }).base, 'main'));
test('sync PR always remains draft', () => assert.equal(planNewsSync({ mode: 'sync-pr', diff: { hasChanges: true } }).draft, true));
test('workflow updates an existing open automation PR', () => assert.match(workflow, /gh pr list --state open --base main --head/));
test('automation push uses force-with-lease only', () => { assert.match(workflow, /git push --force-with-lease/); assert.doesNotMatch(workflow, /git push --force(?:\s|$)/); });

test('apply removes orphaned article output', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-sync-apply-'));
  try { await mkdir(path.join(root, 'news', 'old'), { recursive: true }); await writeFile(path.join(root, 'news', 'old', 'index.html'), 'old'); await applyNewsOutput(root, output({ fresh: 'new' })); const files = await readNewsOutput(root); assert.equal(files.has('news/old/index.html'), false); assert.equal(files.has('news/fresh/index.html'), true); }
  finally { await rm(root, { recursive: true, force: true }); }
});
test('sync-pr applies generated output while validate-only does not', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-sync-modes-'));
  try { await prepareNewsSync({ mode: 'validate-only', workspaceRoot: root, wordpressBaseUrl: 'https://cms.example', fetchImpl: async () => response([]) }); await assert.rejects(readFile(path.join(root, 'news.html'))); await prepareNewsSync({ mode: 'sync-pr', workspaceRoot: root, wordpressBaseUrl: 'https://cms.example', fetchImpl: async () => response([]) }); assert.match(await readFile(path.join(root, 'news.html'), 'utf8'), /Noch keine News/); }
  finally { await rm(root, { recursive: true, force: true }); }
});
