import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = async file => (await readFile(new URL(`../${file}`, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const workflow = await source('.github/workflows/wordpress-pages-sync.yml');
const news = await source('.github/workflows/wordpress-news-sync.yml');
test('Pages dispatch only, explicit environment without default, shared WordPress serialization', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert(!/\n  (push|pull_request|schedule|repository_dispatch):|default:/.test(workflow));
  assert.match(workflow, /options: \[staging, live\]/); assert.match(workflow, /options: \[validate-only, sync-pr\]/);
  for (const text of [workflow, news]) assert.match(text, /concurrency:\n  group: wordpress-news-sync\n  cancel-in-progress: false/);
});
test('Pages permissions split and no deployment, SSH or automatic merge', () => {
  const [validate, sync] = workflow.split('\n  sync-pr:');
  assert.match(validate, /permissions:\n      contents: read\n/); assert(!validate.includes('contents: write'));
  assert.match(sync, /permissions:\n      contents: write\n      pull-requests: write\n/);
  assert(!/actions: write|packages: write|ssh|docker|auto-merge|gh pr merge|workflow run/i.test(workflow));
});
test('workflow binds executable main SHA and validates target before source; both IDs explicit', async () => {
  assert.equal(workflow.match(/ref: \$\{\{ github.sha \}\}/g).length, 2);
  assert.equal(workflow.match(/WORDPRESS_ABOUT_PAGE_ID: \$\{\{ vars.WORDPRESS_ABOUT_PAGE_ID \}\}/g).length, 2);
  assert.equal(workflow.match(/WORDPRESS_HISTORY_PAGE_ID: \$\{\{ vars.WORDPRESS_HISTORY_PAGE_ID \}\}/g).length, 2);
  assert(!workflow.includes('content/live'));
  const runner = await source('scripts/wordpress-pages/staging-sync.mjs');
  assert.match(runner, /GITHUB_REF !== 'refs\/heads\/main'/); assert.match(runner, /GITHUB_REPOSITORY !== REPOSITORY/);
  assert.match(runner, /--force-with-lease=refs\/heads\/\$\{BRANCH\}:\$\{previous\}/);
  assert(!/--force['" ,]|git reset|workflow_dispatch/.test(runner));
  assert(runner.indexOf('pagesConfig(options)') < runner.indexOf('await prepare('));
});
test('PR smoke includes Pages ownership, tests and existing News regression suites', async () => {
  const smoke = await source('.github/workflows/staging-container-smoke.yml');
  for (const value of ['scripts/wordpress-pages/**', 'tests/wordpress-pages*.test.mjs', 'about.html', 'history.html',
    '.github/workflows/wordpress-pages-sync.yml', 'tests/wordpress-news-sync.test.mjs', 'tests/wordpress-staging-pr.test.mjs',
    'tests/headless-wordpress-news.test.mjs', 'tests/news-seo.test.mjs']) assert(smoke.includes(value), value);
});
