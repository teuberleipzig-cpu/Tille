import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../.github/workflows/staging-container-smoke.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('smoke checks out exact PR head and captures content SHA once before composing', () => {
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /git fetch --no-tags origin refs\/heads\/content\/staging:refs\/remotes\/origin\/content\/staging/);
  assert.equal((workflow.match(/git rev-parse refs\/remotes\/origin\/content\/staging/g) || []).length, 1);
  assert.match(workflow, /--code-sha "\$CODE_SHA"/);
  assert.match(workflow, /--content-sha "\$content_sha"/);
  assert.match(workflow, /--content-ref content\/staging/);
  assert.match(workflow, /--environment staging/);
  assert.match(workflow, /--output "\$RUNNER_TEMP\/composed-site" > "\$RUNNER_TEMP\/composition-report.json"/);
  assert.ok(workflow.indexOf('content_sha=') < workflow.indexOf('node scripts/content/compose-site.mjs'));
});

test('both Docker smoke builds use isolated staging context, not live ref or working tree', () => {
  assert.match(workflow, /-t tille-staging-smoke "\$RUNNER_TEMP\/composed-site"/);
  assert.match(workflow, /-t tille-default-smoke "\$RUNNER_TEMP\/composed-site"/);
  assert.equal((workflow.match(/docker build/g) || []).length, 2);
  assert.match(workflow, /--build-arg DEPLOY_TARGET=staging/);
  assert.doesNotMatch(workflow, /refs\/heads\/content\/live|--environment live|--content-ref content\/live/);
});

test('HTTP safety matrix and recovery 404 probes remain, without body logging on failure', () => {
  for (const value of ['nginx -t', '/sitemap.xml', 'noindex, nofollow, noarchive', 'no-store',
    '/docker/nginx.conf', '/docker/nginx.staging.conf', '/robots.staging.txt',
    '/public/residents/data/residents-backup-before-restore.json', '/public/residents/data/recovery-note.txt']) {
    assert.ok(workflow.includes(value), value);
  }
  assert.match(workflow, /for endpoint in \/sitemap.xml .*residents-backup-before-restore.json .*recovery-note.txt; do\n\s+assert_status "\$endpoint" 404/);
  assert.match(workflow, /Disallow:/);
  assert.doesNotMatch(workflow, /cat "\$body"/);
});

test('CI runs Linux composition tests with read-only permissions and no publishing', () => {
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /node --test .*tests\/content-composition.test.mjs/);
  assert.doesNotMatch(workflow, /contents: write|packages: write|pull_request_target|workflow_dispatch|docker push|gh pr merge|--auto|\bssh\b|ghcr.io/);
  assert.match(workflow, /'scripts\/content\/\*\*'/);
});
