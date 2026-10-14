import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workflow = readFileSync(new URL('../.github/workflows/deploy-prod.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('prod deploy is manual and requires an explicit tag input', () => {
  assert.match(workflow, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(workflow, /push:|pull_request:/);
  const block = workflow.split('      tag:\n')[1].split(/\n\S/)[0];
  assert.match(block, /required: true/);
  assert.match(block, /type: string/);
});

test('tag is validated before SSH and handed to the script; prod user and key', () => {
  assert.ok(workflow.indexOf('Validate image tag') < workflow.indexOf('Reload container on vps03 (prod)'));
  assert.match(workflow, /\^\[A-Za-z0-9_\]\[A-Za-z0-9_\.-\]\{0,127\}\$/);
  for (const value of [
    'host: containerhost01.distillery.de',
    'username: deploy-www-prod-distillery',
    'key: ${{ secrets.DEPLOY_SSH_KEY_WWW_TEST }}',
    'script: /usr/local/sbin/deploy-www-test-distillery.sh ${{ steps.tag.outputs.value }}',
  ]) assert.ok(workflow.includes(value), value);
  assert.doesNotMatch(workflow, /script:.*inputs\.tag/);
});
