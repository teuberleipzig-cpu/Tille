import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyStagingDeployment } from '../scripts/content/staging-deployment-e2e.mjs';
import { sha256 } from '../scripts/content/deployment-report.mjs';

const code = 'fixture code\r\n', content = '{"fixture":true}\n';
const args = { codeHash: sha256(code), contentHash: sha256(content), runId: '123-1', attempts: 1 };
function mock(overrides = {}, calls = []) {
  return async (url, options) => {
    const parsed = new URL(url);
    calls.push(parsed);
    assert.equal(parsed.origin, 'https://www-test.distillery.de');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
    const endpoint = parsed.pathname;
    const body = { '/index.html': code, '/public/events/data/manifest.json': content,
      '/healthz': 'ok', '/robots.txt': 'User-agent: *\r\nDisallow: /\r\n' }[endpoint];
    const config = { status: body === undefined ? 404 : 200, body: body || 'not-found',
      headers: { 'x-robots-tag': 'noindex, nofollow, noarchive', 'cache-control': 'no-store' }, ...overrides[endpoint] };
    return new Response(config.body, { status: config.status, headers: config.headers });
  };
}

test('E2E checks both hashes and all security endpoints using query-only cache busting', async () => {
  const calls = [];
  assert.equal((await verifyStagingDeployment({ ...args, fetchImpl: mock({}, calls) })).valid, true);
  assert.equal(calls.length, 9);
  assert.ok(calls.every(url => url.search === '?deploy_verify=123-1-1'));
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
  assert.ok(calls.every(url => url.search === '?deploy_verify=123-1-2'));
  let failures = 0;
  await assert.rejects(verifyStagingDeployment({ ...args, attempts: 6,
    fetchImpl: async () => { failures++; throw new Error('secret response'); }, sleep: async () => {} }), error =>
    /E2E failed/.test(error.message) && !error.message.includes('secret response'));
  assert.equal(failures, 6);
});

test('invalid hashes/run identity/retry budgets rejected before any HTTP call', async () => {
  for (const patch of [{ codeHash: '' }, { contentHash: 'bad' }, { runId: 'untrusted&url' }, { attempts: 7 }]) {
    await assert.rejects(verifyStagingDeployment({ ...args, ...patch, fetchImpl: () => assert.fail('network must not run') }));
  }
});
