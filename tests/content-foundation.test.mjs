import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { ENVIRONMENTS, resolveEnvironment, bindContentEnvironment } from '../scripts/content/environments.mjs';
import { validateEnvironment } from '../scripts/filemaker/contracts-v2/event-contract.mjs';
import { CONTENT_MANIFEST } from '../scripts/content/content-manifest.mjs';
import { classifyContentPath, validateContentChanges } from '../scripts/content/content-scope.mjs';
import { contentRevision } from '../scripts/content/revision.mjs';

const validate = paths => validateContentChanges({ environment: 'staging', contentRef: 'content/staging', paths });
const revision = { environment: 'staging', contentRef: 'content/staging', codeSha: 'a'.repeat(40), contentSha: 'b'.repeat(40) };

for (const environment of ['staging', 'live']) test(`environment ${environment}`, () => {
  const config = resolveEnvironment(environment);
  assert.equal(config.environment, validateEnvironment(environment));
  assert.equal(config.contentRef, `content/${environment}`);
  assert.equal(config.buildTarget, environment);
});
for (const environment of [undefined, null, '', 'main', 'feature/x', 'content/staging', 'Staging', 'LIVE', ' staging', 'live ', 1, {}, '__proto__']) {
  test(`invalid environment ${JSON.stringify(environment)}`, () => assert.throws(() => resolveEnvironment(environment)));
}
test('environment bindings reject cross-environment and absent refs', () => {
  for (const ref of [undefined, 'main', 'content/live', 'refs/heads/content/staging']) {
    assert.throws(() => bindContentEnvironment('staging', ref));
    assert.throws(() => validateContentChanges({ ...revision, contentRef: ref, paths: [] }));
    assert.throws(() => contentRevision({ ...revision, contentRef: ref }));
  }
});
test('central config and manifest cannot be mutated', () => {
  assert.throws(() => { ENVIRONMENTS.staging.contentRef = 'main'; });
  assert.throws(() => CONTENT_MANIFEST.rules.push({}));
  assert.throws(() => { CONTENT_MANIFEST.rules[0].pattern = '.*'; });
  assert.throws(() => CONTENT_MANIFEST.rules[0].owners.push('other'));
});

const examples = {
  'event-months': 'public/events/data/months/2026-09.json',
  'event-meta': 'public/events/data/meta.json',
  'event-manifest': 'public/events/data/manifest.json',
  'event-index': 'public/events/data/event-index.json',
  'event-search': 'public/events/data/search-index.json',
  'event-pages': 'events/fm-example/index.html',
  'event-media': 'public/events/media/shared/migrated-123.jpg',
  residents: 'public/residents/data/residents.json',
  'resident-images': 'public/residents/media/submod/photos/photo-123.jpg',
  'resident-presskits': 'public/residents/media/submod/presskit/presskit-123.pdf',
  'resident-pages': 'residents/submod/index.html',
  'news-legacy': 'news.html',
  'news-overview': 'news/index.html',
  'news-articles': 'news/example-post/index.html',
  gallery: 'public/gallery/data/gallery.json',
  'gallery-media': 'public/gallery/media/example/image-123.webp',
  navigation: 'public/site/data/site-navigation.json',
  sitemap: 'sitemap.xml'
};
for (const [id, path] of Object.entries(examples)) test(`verified content ${id}`, () => {
  const result = validate([path]);
  assert.equal(result.valid, true);
  assert.equal(result.accepted[0].ruleId, id);
  assert.deepEqual(result.rejected, []);
});
test('test coverage includes every content rule and all exact paths', () => {
  const rules = CONTENT_MANIFEST.rules.filter(rule => rule.classification !== 'CODE');
  assert.deepEqual(rules.map(rule => rule.id).sort(), Object.keys(examples).sort());
  for (const rule of rules.filter(rule => rule.exact)) assert.equal(validate([rule.exact]).valid, true);
});
test('release covers and ZIP presskits have the same verified media owners', () => {
  assert.equal(validate(['public/residents/media/submod/releases/cover-123.jpg', 'public/residents/media/submod/presskit/presskit-123.zip']).valid, true);
});
for (const path of ['index.html', 'event.html', 'assets/tracking.js', '.github/workflows/docker-publish.yml', 'docker/Dockerfile', 'tests/example.test.mjs', 'docs/example.md', 'public/admin/js/admin-app.js', 'public/resident-portal/js/core/github.js', 'public/site/js/event-storage-model.js', 'public/gallery/js/gallery-model.js']) {
  test(`code denied ${path}`, () => {
    assert.equal(classifyContentPath(path).classification, 'CODE');
    assert.equal(validate([path]).valid, false);
  });
}
for (const path of [
  'public/events/data/months/2026-13.json', 'public/events/data/events.json',
  'public/events/data/manifest.json.bak', 'public/events/data-evil/meta.json',
  'public/residents/data/residents-backup-before-restore.json', 'public/residents/data/recovery-note.txt',
  'events-evil/id/index.html', 'events/id/code.js', 'events/id/nested/index.html',
  'news/index.js', 'news/example/code.html', 'unknown.json', 'sitemap.xml.bak',
  'public/residents/media/submod/photos/code.js', 'public/gallery/media/x/code.html',
  'public/events/media/shared/code.js', 'public/site/data/unknown.json'
]) test(`unknown or overbroad path denied ${path}`, () => assert.equal(validate([path]).valid, false));
for (const path of [
  '../sitemap.xml', '/sitemap.xml', 'C:/sitemap.xml', 'C:sitemap.xml', '//server/share',
  'public\\events\\data\\meta.json', 'public/events/data/../data/meta.json',
  'public/events/data/./meta.json', 'public/events//data/meta.json', 'sitemap.xml/',
  'sitemap.xml ', 'sitemap.xml\n', 'sitemap.xml\0', 'news/%2e%2e/index.html',
  'events/id/index.html\n', 'public/events/media/shared/image.jpg\n',
  'news/%252e%252e/index.html', 'events/CON/index.html', 'events/id./index.html', '', null, 7
]) test(`ambiguous path rejected ${JSON.stringify(path)}`, () => assert.equal(validate([path]).valid, false));
test('reports every rejected path and never silently filters a mixed list', () => {
  const paths = ['sitemap.xml', 'index.html', '../escape', 'unknown.json'];
  const result = validate(paths);
  assert.equal(result.valid, false);
  assert.deepEqual(result.rejected.map(item => item.path), paths.slice(1));
  assert.equal(result.accepted.length, 1);
  assert.deepEqual(result.rejected.map(item => item.index), [1, 2, 3]);
});
test('empty is an explicit valid no-op; sparse or non-array inputs are not', () => {
  assert.deepEqual(validate([]), { environment: 'staging', contentRef: 'content/staging', valid: true, empty: true, accepted: [], rejected: [] });
  assert.equal(validate(new Array(1)).valid, false);
  for (const value of [null, undefined, 'sitemap.xml', {}]) assert.throws(() => validate(value));
});
test('manifest owners exist, ids are unique and rules are unambiguous in shape', async () => {
  assert.equal(new Set(CONTENT_MANIFEST.rules.map(rule => rule.id)).size, CONTENT_MANIFEST.rules.length);
  for (const rule of CONTENT_MANIFEST.rules) {
    assert.notEqual(Boolean(rule.exact), Boolean(rule.tree));
    for (const owner of rule.owners) if (owner !== 'repository-code-review') await access(new URL(`../${owner}`, import.meta.url));
  }
  const source = await readFile(new URL('../scripts/content/content-scope.mjs', import.meta.url), 'utf8');
  assert.match(source, /import.*CONTENT_MANIFEST/);
  assert.doesNotMatch(source, /public\/|sitemap\.xml|node:|fetch\(/);
});
test('sitemap belongs to the whole environment with all three generator owners', () => {
  const rule = classifyContentPath('sitemap.xml');
  assert.equal(rule.shared, true);
  assert.equal(rule.owners.length, 3);
});

test('revision uses full hashes, bound target and deterministic environment-specific identity', () => {
  const output = contentRevision(revision);
  assert.deepEqual(contentRevision(revision), output);
  assert.equal(output.artifactId, `staging-code-${revision.codeSha}-content-${revision.contentSha}`);
  assert.ok(output.artifactId.length <= 128);
  const live = contentRevision({ ...revision, environment: 'live', contentRef: 'content/live' });
  assert.notEqual(live.artifactId, output.artifactId);
  assert.equal(live.buildTarget, 'live');
  assert.notEqual(contentRevision({ ...revision, contentSha: 'c'.repeat(40) }).artifactId, output.artifactId);
  assert.notEqual(contentRevision({ ...revision, codeSha: 'c'.repeat(40) }).artifactId, output.artifactId);
});
for (const value of ['', 'abc123', 'A'.repeat(40), 'g'.repeat(40), 'a'.repeat(39), 'a'.repeat(41), 'a'.repeat(64), ' ' + 'a'.repeat(40), 'a'.repeat(40) + '\n', 'a'.repeat(40) + '\r\n', null, 123]) {
  test(`invalid full Git SHA ${JSON.stringify(value)}`, () => {
    for (const key of ['codeSha', 'contentSha']) assert.throws(() => contentRevision({ ...revision, [key]: value }));
  });
}
test('revision does not propagate secrets, hosts or caller-supplied build targets', () => {
  const output = contentRevision({ ...revision, token: 'private-fixture', hostname: 'internal.invalid', buildTarget: 'live' });
  assert.equal(output.buildTarget, 'staging');
  assert.doesNotMatch(JSON.stringify(output), /private-fixture|internal\.invalid|publicHost|token|hostname/);
});
