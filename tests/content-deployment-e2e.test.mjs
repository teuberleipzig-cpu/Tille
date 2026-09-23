import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyStagingDeployment } from '../scripts/content/staging-deployment-e2e.mjs';
import { sha256 } from '../scripts/content/deployment-report.mjs';
import { acceptanceFixture, acceptanceFetch } from './helpers/staging-acceptance-fixture.mjs';

const fixture = acceptanceFixture();
const code = fixture.bodies['/index.html'], content = JSON.stringify(fixture.documents['/public/events/data/manifest.json']);
const args = { codeHash: sha256(code), contentHash: sha256(content), runId: '123-1', attempts: 1 };
function mock(overrides = {}, calls = []) {
  const data = acceptanceFixture();
  Object.assign(data.bodies, { '/healthz': 'ok', '/robots.txt': 'User-agent: *\r\nDisallow: /\r\n' });
  return acceptanceFetch(data, overrides, calls);
}

test('E2E checks both hashes and all security endpoints using query-only cache busting', async () => {
  const calls = [];
  assert.equal((await verifyStagingDeployment({ ...args, fetchImpl: mock({}, calls) })).valid, true);
  for (const path of ['/healthz', '/sitemap.xml', '/robots.txt', '/public/admin/', '/public/resident-portal/',
    '/public/residents/data/residents.json', '/events/fixture-2026-01/']) assert.ok(calls.some(url => url.pathname === path));
  assert.ok(calls.every(url => url.searchParams.get('deploy_verify') === '123-1-1'));
});

for (const [name, overrides] of [
  ['code hash', { '/index.html': { body: 'old' } }],
  ['content hash', { '/public/events/data/manifest.json': { body: 'old' } }],
  ['noindex', { '/index.html': { headers: { 'x-robots-tag': 'nofollow, noarchive' } } }],
  ['no-store', { '/public/events/data/manifest.json': { headers: { 'x-robots-tag': 'noindex,nofollow,noarchive' } } }],
  ['robots', { '/robots.txt': { body: 'User-agent: *\nAllow: /' } }],
  ...['/healthz', '/sitemap.xml', '/public/residents/data/residents-backup-before-restore.json',
    '/public/residents/data/recovery-note.txt', '/docker/nginx.conf', '/robots.staging.txt'].map(endpoint =>
    [endpoint, { [endpoint]: { status: endpoint === '/healthz' ? 503 : 200, body: 'private body must never be echoed' } }])
]) {
  test(`E2E fails closed: ${name}`, async () => {
    await assert.rejects(verifyStagingDeployment({ ...args, fetchImpl: mock(overrides) }), error =>
      /E2E failed/.test(error.message) && !error.message.includes('private body'));
  });
}

test('bounded retries wait for both probes, then pass; persistent transport failures stay failures', async () => {
  let fetchCount = 0, sleeps = 0;
  const calls = [], success = mock({}, calls);
  const fetchImpl = async (...params) => ++fetchCount === 1 ? new Response('old') : success(...params);
  const result = await verifyStagingDeployment({ ...args, attempts: 3, fetchImpl, sleep: async ms => { assert.equal(ms, 10000); sleeps++; } });
  assert.equal(result.attempts, 2);
  assert.equal(sleeps, 1);
  assert.ok(calls.every(url => url.searchParams.get('deploy_verify') === '123-1-2'));
  let failures = 0;
  await assert.rejects(verifyStagingDeployment({ ...args, attempts: 6,
    fetchImpl: async () => { failures++; throw new Error('secret response'); }, sleep: async () => {} }), error =>
    /E2E failed/.test(error.message) && !error.message.includes('secret response'));
  assert.equal(failures, 6);
});

test('acceptance runs only after security passes and shares the same retry budget', async () => {
  const calls = [];
  await assert.rejects(verifyStagingDeployment({ ...args, fetchImpl: mock({ '/sitemap.xml': { status: 200 } }, calls) }));
  assert.ok(!calls.some(url => url.pathname === '/about.html'));
  let sleeps = 0;
  const retryCalls = [];
  await assert.rejects(verifyStagingDeployment({ ...args, attempts: 2,
    fetchImpl: mock({ '/about.html': { status: 500 } }, retryCalls), sleep: async () => { sleeps++; } }),
  /Staging acceptance \/about.html: expected HTTP 200/);
  assert.equal(sleeps, 1);
  assert.deepEqual([...new Set(retryCalls.map(url => url.searchParams.get('deploy_verify')))], ['123-1-1', '123-1-2']);
});

test('invalid hashes/run identity/retry budgets rejected before any HTTP call', async () => {
  for (const patch of [{ codeHash: '' }, { contentHash: 'bad' }, { runId: 'untrusted&url' }, { attempts: 7 }]) {
    await assert.rejects(verifyStagingDeployment({ ...args, ...patch, fetchImpl: () => assert.fail('network must not run') }));
  }
});
