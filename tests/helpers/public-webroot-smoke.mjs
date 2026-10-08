// Local/CI container probe only. No deploy, credentials, external origin or writes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { directories, isPublic, inventory, referenceInventory, negativePaths } from './public-webroot.mjs';

const { values: args } = parseArgs({ options: Object.fromEntries(
  ['context', 'container', 'origin', 'target'].map(k => [k, { type: 'string' }])) });
assert.ok(['staging', 'default'].includes(args.target));
assert.match(args.container, /^tille-(?:staging|default)-smoke$/);
const origin = new URL(args.origin);
assert.equal(origin.hostname, '127.0.0.1');
assert.equal(origin.protocol, 'http:');
assert.equal(origin.username + origin.password + origin.search + origin.hash, '');
const staging = args.target === 'staging';
const files = inventory(args.context);
const expected = files.filter(f => isPublic(f) && !(staging && f === 'sitemap.xml')).sort();
const actual = execFileSync('docker', ['exec', args.container, 'find', '/usr/share/nginx/html', '-type', 'f'],
  { encoding: 'utf8' }).trim().split('\n').map(p => p.replace('/usr/share/nginx/html/', '')).sort();
assert.deepEqual(actual, expected, 'exact final document-root file inventory');
for (const dir of ['scripts', 'tests', 'docs', '.github', 'reports', 'docker', '.git']) {
  execFileSync('docker', ['exec', args.container, 'test', '!', '-e', '/usr/share/nginx/html/' + dir]);
}
for (const file of negativePaths) {
  execFileSync('docker', ['exec', args.container, 'test', '!', '-e', '/usr/share/nginx/html/' + file]);
}
assert.equal(execFileSync('docker', ['exec', args.container, 'find', '/usr/share/nginx/html', '-type', 'l'],
  { encoding: 'utf8' }).trim(), '', 'no symlinks');
for (const ref of referenceInventory(args.context, files)) assert.ok(isPublic(ref), ref);
for (const f of expected) assert.doesNotMatch(f, /\.(?:md|mjs|ps1|sh|ya?ml|map|bak)$|(?:^|\/)(?:tests|fixtures|reports)\//);

async function response(endpoint, status) {
  const res = await fetch(new URL(endpoint, origin), { redirect: 'error', signal: AbortSignal.timeout(10000) });
  assert.equal(res.status, status, endpoint);
  const robots = res.headers.get('x-robots-tag') || '';
  if (staging) assert.match(robots, /noindex, nofollow, noarchive/, endpoint);
  else assert.doesNotMatch(robots, /noindex/, endpoint);
  return Buffer.from(await res.arrayBuffer());
}
const negatives = [...negativePaths, '__public-boundary-missing__', ...(staging ? ['sitemap.xml'] : [])];
for (const endpoint of negatives) {
  const body = await response('/' + endpoint, 404);
  assert.ok(body.includes(Buffer.from('Seite nicht gefunden')), 'custom 404: ' + endpoint);
}

// All publishable files, including every composed content page/media, must still
// be reachable and byte-identical. Read locally only; never log response bodies.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const file of expected) {
  if (file === '404.html') continue; // nginx internal error page, checked above
  const body = await response('/' + file.split('/').map(encodeURIComponent).join('/'), 200);
  const source = staging && file === 'robots.txt' ? 'robots.staging.txt' : file;
  assert.equal(hash(body), hash(readFileSync(path.join(args.context, source))), 'bytes: ' + file);
}
for (const dir of ['', 'public/admin', 'public/resident-portal', 'residents/bigalke']) {
  await response('/' + (dir ? dir + '/' : ''), 200);
}
console.log(JSON.stringify({ target: args.target, publicFiles: expected.length,
  namespaces: directories, negativeHttpChecks: negatives.length,
  filesystem: 'PASS', positiveHttpByteChecks: expected.length - 1, references: 'PASS' }));
