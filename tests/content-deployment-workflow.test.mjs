import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const workflow = readFileSync(new URL('../.github/workflows/docker-publish.yml', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const step = name => {
  const value = workflow.split(`- name: ${name}\n`)[1];
  assert.ok(value, `missing step ${name}`);
  return value.split(/\n      - (?:name:|uses:)/)[0];
};

test('explicit main checkout and required manual code/content SHA inputs, no movable checkout fallback', () => {
  assert.match(workflow, /push:\n    branches: \[main\]/);
  assert.doesNotMatch(workflow, /paths-ignore:/);
  assert.match(workflow, /ref: \$\{\{ github.sha \}\}/);
  assert.match(workflow, /fetch-depth: 0/);
  for (const input of ['expected_sha', 'expected_content_sha']) {
    const block = workflow.split(`      ${input}:\n`)[1].split(/\n(?:      \w|concurrency:)/)[0];
    assert.match(block, /required: true/);
    assert.match(block, /type: string/);
  }
  assert.doesNotMatch(workflow, /inputs\.expected_sha != ''/);
});

test('single staging ref capture feeds gates and composition before Buildx or publish', () => {
  assert.equal((workflow.match(/git fetch --no-tags origin refs\/heads\/content\/staging/g) || []).length, 1);
  assert.equal((workflow.match(/git rev-parse refs\/remotes\/origin\/content\/staging/g) || []).length, 1);
  assert.match(step('Verify expected deployment SHA'), /node scripts\/content\/prepare-staging-deployment.mjs/);
  const compose = step('Compose and verify staging context');
  assert.match(compose, /steps.bind.outputs.content_sha/);
  assert.match(compose, /--environment staging --code-sha "\$CODE_SHA"/);
  assert.match(compose, /--content-ref content\/staging --content-sha "\$CONTENT_SHA"/);
  assert.match(compose, /node scripts\/content\/prepare-deployment-report.mjs/);
  for (const later of ['docker/setup-buildx-action', 'Log in to GHCR', 'Build and push', 'Reload container on vps03']) {
    assert.ok(workflow.indexOf('Compose and verify staging context') < workflow.indexOf(later));
  }
});

test('composed context, composer artifact tag, staging aliases and digest outputs', () => {
  const build = step('Build and push');
  assert.match(build, /context: \$\{\{ runner.temp \}\}\/composed-site/);
  assert.doesNotMatch(build, /context: \.(?:\s|$)/);
  assert.match(build, /DEPLOY_TARGET=staging/);
  assert.match(build, /IMAGE \}\}:\$\{\{ steps.composition.outputs.artifact_id/);
  assert.match(build, /IMAGE \}\}:latest/);
  assert.match(workflow, /digest: \$\{\{ steps.image.outputs.digest \}\}/);
  assert.match(step('Record intended staging image'), /needs.build.outputs.digest/);
});

test('staging SSH target unchanged; E2E uses both pre-build probe hashes after reload', () => {
  const ssh = step('Reload container on vps03');
  for (const value of ['host: vps03.itlej.de', 'username: deploy-www-test-distillery', 'script: /usr/local/sbin/deploy-www-test-distillery.sh']) assert.ok(ssh.includes(value));
  const e2e = step('Verify deployed code content and staging security');
  assert.match(e2e, /needs.build.outputs.code_probe_sha256/);
  assert.match(e2e, /needs.build.outputs.content_probe_sha256/);
  assert.match(e2e, /node scripts\/content\/verify-staging-deployment.mjs/);
  assert.ok(workflow.indexOf('Reload container on vps03') < workflow.indexOf('Verify deployed code content and staging security'));
  assert.match(workflow, /ref: \$\{\{ needs.build.outputs.code_sha \}\}/);
});

test('workflow serializes complete staging run without cancelling SSH; no live or fallback', () => {
  assert.match(workflow, /concurrency:\n  group: docker-publish\n[^]*?cancel-in-progress: false/);
  assert.doesNotMatch(workflow, /content\/live|DEPLOY_TARGET=live|gh pr merge|--auto|continue-on-error|\|\| true/);
  assert.match(workflow, /needs: build/);
});
