import { DEPLOYMENT_PROBES, sha256 } from './deployment-report.mjs';
import { verifyStagingAcceptance } from './staging-acceptance.mjs';
import { acceptanceFailureMessage } from './staging-acceptance-http.mjs';

const ORIGIN = 'https://www-test.distillery.de';
const ABSENT = ['/sitemap.xml', '/public/residents/data/residents-backup-before-restore.json',
  '/public/residents/data/recovery-note.txt', '/docker/nginx.conf', '/robots.staging.txt'];
const assertHash = value => {
  if (!/^[a-f0-9]{64}$/.test(value || '')) throw new Error('Expected probe SHA-256 required.');
};

async function probe(fetchImpl, endpoint, query, expectedStatus) {
  const response = await fetchImpl(`${ORIGIN}${endpoint}?deploy_verify=${query}`, {
    redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000)
  });
  if (response.status !== expectedStatus) throw new Error(`Staging probe ${endpoint}: unexpected HTTP status ${response.status}.`);
  const robots = (response.headers.get('x-robots-tag') || '').toLowerCase().split(/[,\s]+/);
  if (!['noindex', 'nofollow', 'noarchive'].every(token => robots.includes(token))) {
    throw new Error(`Staging probe ${endpoint}: missing noindex/nofollow/noarchive.`);
  }
  return response;
}

async function verifyAttempt({ fetchImpl, codeHash, contentHash, query }) {
  let manifestText;
  for (const [kind, expected] of [['code', codeHash], ['content', contentHash]]) {
    const endpoint = '/' + DEPLOYMENT_PROBES[kind];
    const response = await probe(fetchImpl, endpoint, query, 200);
    if (kind === 'content' && !/(?:^|,)\s*no-store\s*(?:,|$)/i.test(response.headers.get('cache-control') || '')) {
      throw new Error('Staging content probe: missing no-store.');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sha256(bytes) !== expected) throw new Error(`Staging ${kind} probe hash mismatch.`);
    if (kind === 'content') manifestText = bytes.toString('utf8');
  }
  const health = await probe(fetchImpl, '/healthz', query, 200);
  await health.body?.cancel();
  const robots = await probe(fetchImpl, '/robots.txt', query, 200);
  const text = await robots.text();
  if (!/^Disallow:\s*\/\s*$/im.test(text) || !/^User-agent:\s*\*\s*$/im.test(text) || /^Allow:/im.test(text)) {
    throw new Error('Staging robots policy mismatch.');
  }
  for (const endpoint of ABSENT) {
    const response = await probe(fetchImpl, endpoint, query, 404);
    await response.body?.cancel(); // Never log or inspect possible recovery bodies.
  }
  await verifyStagingAcceptance({ fetchImpl, query, manifestText });
}

export async function verifyStagingDeployment({ codeHash, contentHash, runId,
  fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), attempts = 6 }) {
  assertHash(codeHash);
  assertHash(contentHash);
  if (!/^[0-9]+-[0-9]+$/.test(runId || '')) throw new Error('Numeric run ID and run attempt required.');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 6) throw new Error('Retry budget must be 1..6.');
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await verifyAttempt({ fetchImpl, codeHash, contentHash, query: `${runId}-${attempt}` });
      return { valid: true, environment: 'staging', attempts: attempt, codeHash, contentHash };
    } catch (error) {
      // Do not echo transport errors: they may include response bodies or credentials.
      if (attempt === attempts) throw new Error('Staging E2E failed: ' + (acceptanceFailureMessage(error)
        || 'code/content hashes or security probes did not pass within the retry budget.'));
      await sleep(10000);
    }
  }
}
