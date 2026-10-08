import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { directories, rootFiles, isPublic, inventory, referenceInventory, negativePaths } from './helpers/public-webroot.mjs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const docker = read('docker/Dockerfile');
const workflow = read('.github/workflows/staging-container-smoke.yml');

test('Docker publishes exactly the positive sources, never the repository or blanket public directory', () => {
  const copies = [...docker.matchAll(/^COPY (.+) \/usr\/share\/nginx\/html(\S*)$/gm)];
  assert.equal(copies.length, directories.length + 3);
  assert.ok(copies.some(m => m[1] === '*.html ' + rootFiles.join(' ') && m[2] === '/'));
  assert.ok(copies.some(m => m[1] === '.well-known/security.txt' && m[2] === '/.well-known/security.txt'));
  assert.ok(copies.some(m => m[1] === 'public/admin/*.html public/admin/*.js' && m[2] === '/public/admin/'));
  for (const dir of directories) assert.ok(copies.some(m => m[1] === dir + '/' && m[2] === '/' + dir + '/'), dir);
  assert.doesNotMatch(docker, /^\s*(?:COPY|ADD)\s+(?:\.\s|\.\/\s|public\/\s)/m);
  assert.match(docker, /RUN rm -rf \/usr\/share\/nginx\/html && mkdir -p/);
});

test('new internal namespaces cannot become public; internal Admin notes are excluded too', () => {
  for (const file of [...negativePaths, 'AGENTS.md', 'new-internal/secret.json', 'package.json',
    'scripts/new.js', 'tests/new.html', '.gitattributes', '.nojekyll', 'reports/report.html']) {
    assert.equal(isPublic(file), false, file);
  }
});

test('public inventory preserves references, applications, generated families, assets and runtime JSON', () => {
  const files = inventory(fileURLToPath(root));
  const refs = referenceInventory(fileURLToPath(root), files);
  assert.ok(refs.length > 100);
  for (const ref of refs) assert.ok(isPublic(ref), ref);
  for (const file of ['404.html', 'feedback-thanks.html', 'favicon.svg', '.well-known/security.txt',
    'public/admin/index.html', 'public/resident-portal/index.html', 'public/events/data/manifest.json',
    'public/residents/data/residents.json', 'public/gallery/data/gallery.json',
    'public/site/data/site-navigation.json', 'residents/bigalke/index.html', 'news/index.html']) {
    assert.ok(files.includes(file), file); assert.ok(isPublic(file), file);
  }
  assert.ok(files.filter(f => f.startsWith('events/') && isPublic(f)).length > 1500);
  // No currently published build/debug artefacts. Future additions need explicit review.
  for (const file of files.filter(isPublic)) {
    assert.doesNotMatch(file, /\.(?:md|mjs|ps1|sh|ya?ml|map|bak)$|(?:^|\/)(?:tests|fixtures|reports)\//, file);
  }
});

test('Docker build-only inputs, default live and staging robots/sitemap policies remain explicit', () => {
  assert.match(docker, /ARG DEPLOY_TARGET=live/);
  for (const file of ['nginx.conf', 'nginx.staging.conf']) assert.ok(docker.includes('COPY docker/' + file + ' /tmp/'));
  assert.match(docker, /COPY robots.staging.txt \/tmp\/robots.staging.txt/);
  assert.match(docker, /staging\)[\s\S]*cp \/tmp\/robots.staging.txt \/usr\/share\/nginx\/html\/robots.txt/);
  assert.match(docker, /rm -f \/usr\/share\/nginx\/html\/sitemap.xml/);
  assert.match(docker, /rm -f \/tmp\/robots.staging.txt \/tmp\/nginx.live.conf \/tmp\/nginx.staging.conf/);
  assert.match(docker, /Unsupported DEPLOY_TARGET/);
  assert.match(read('docker/nginx.staging.conf'), /X-Robots-Tag "noindex, nofollow, noarchive" always/);
  for (const file of ['docker/nginx.conf', 'docker/nginx.staging.conf']) assert.match(read(file), /error_page 404 \/404.html/);
});

test('exact-head read-only smoke runs inventory, filesystem and HTTP checks for both real images', () => {
  for (const p of ['tests/public-webroot.test.mjs', 'tests/helpers/public-webroot*.mjs']) assert.ok(workflow.includes("- '" + p + "'"));
  assert.match(workflow, /node --test tests\/public-webroot.test.mjs/);
  for (const target of ['staging', 'default']) assert.ok(workflow.includes(`--container tille-${target}-smoke`));
  assert.doesNotMatch(workflow, /docker push|docker login|workflow_dispatch:|contents: write/);
});
