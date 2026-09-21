import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureRepo, fixtureBlob, fixtureCommit } from './helpers/content-bootstrap-fixture.mjs';

const cli = fileURLToPath(new URL('../scripts/content/prepare-staging-deployment.mjs', import.meta.url));

test('binding CLI writes only validated revisions; missing dispatch input or legacy push writes no outputs', async t => {
  const root = await fixtureRepo();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const blob = fixtureBlob(root, 'fixture');
  const base = fixtureCommit(root, [{ path: 'index.html', sha: blob }]);
  const tip = fixtureCommit(root, [{ path: 'index.html', sha: blob }, { path: 'sitemap.xml', sha: blob }], base.commit);
  const eventPath = path.join(root, 'event.json'), output = path.join(root, 'output');
  const invoke = (eventName, event) => {
    writeFileSync(eventPath, JSON.stringify(event));
    rmSync(output, { force: true });
    return spawnSync(process.execPath, [cli], { cwd: root, encoding: 'utf8', env: { ...process.env,
      GITHUB_EVENT_NAME: eventName, GITHUB_REF: 'refs/heads/main', CODE_SHA: tip.commit,
      ACTUAL_CODE_SHA: tip.commit, CONTENT_SHA: base.commit, GITHUB_EVENT_PATH: eventPath, GITHUB_OUTPUT: output } });
  };
  const manual = invoke('workflow_dispatch', { inputs: { expected_sha: tip.commit, expected_content_sha: base.commit } });
  assert.equal(manual.status, 0, manual.stderr);
  assert.equal(readFileSync(output, 'utf8'), `code_sha=${tip.commit}\ncontent_sha=${base.commit}\n`);
  const missing = invoke('workflow_dispatch', { inputs: { expected_sha: tip.commit } });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /expected_content_sha/);
  assert.equal(existsSync(output), false);
  const legacy = invoke('push', { before: base.commit, after: tip.commit, forced: false });
  assert.equal(legacy.status, 1);
  assert.match(legacy.stderr, /Legacy content write on main detected; writer must use content\/staging./);
  assert.equal(existsSync(output), false);
  for (const event of [{ before: base.commit, after: base.commit },
    { before: base.commit, after: tip.commit, deleted: true }, { before: base.commit, after: tip.commit, created: true }]) {
    assert.equal(invoke('push', event).status, 1);
    assert.equal(existsSync(output), false);
  }
});
