import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bindStagingDeployment } from '../scripts/content/deployment-binding.mjs';
import { bindWriter, deploymentInputs, writerEnvironment } from '../scripts/filemaker/staging-contract.mjs';
import { createStagingOperation } from '../public/admin/js/core/staging-operation.js';
import { settings } from '../public/admin/js/core/staging-contract.js';
import { resolveEnvironment, assertWritable } from '../public/resident-portal/js/core/environment.js';
import { loginSession } from '../public/resident-portal/js/core/portal-session.js';
import { stagingEnvironment } from '../scripts/news/staging-contract.mjs';
import { publishStagingNews } from '../scripts/news/staging-publish.mjs';
import { githubMock, config, CODE, CONTENT } from './helpers/admin-staging-github.mjs';
import { githubFixture, fixtureResident } from './helpers/portal-github-fixture.mjs';
import { buildEventImageOnlySavePlan } from '../public/admin/js/core/event-image-only-save.js';
import { storageArtifacts } from '../public/site/js/event-storage-model.js';
import { updateEventSitemap } from '../scripts/events/event-seo.mjs';
import { updateNewsSitemap } from '../scripts/news/news-seo.mjs';

function acceptsDeployment(inputs) {
  assert.deepEqual(Object.keys(inputs).sort(), ['expected_content_sha', 'expected_sha']);
  const result = bindStagingDeployment({ eventName: 'workflow_dispatch', ref: 'refs/heads/main',
    codeSha: inputs.expected_sha, actualCodeSha: inputs.expected_sha, contentSha: inputs.expected_content_sha, inputs });
  assert.equal(result.contentRef, 'content/staging');
  assert.throws(() => bindStagingDeployment({ eventName: 'workflow_dispatch', ref: 'refs/heads/main',
    codeSha: inputs.expected_sha, actualCodeSha: inputs.expected_sha, contentSha: inputs.expected_content_sha,
    inputs: { expected_sha: inputs.expected_sha } }));
}

test('integrated FileMaker output satisfies mandatory composed deployment inputs', () => {
  const binding = bindWriter({ environment: 'staging', mode: 'sync-pr', codeSha: CODE, contentSha: CONTENT,
    eventId: 'fm-11111111-2222-3333-4444-555555555555' });
  assert.equal(binding.contentRef, 'content/staging');
  acceptsDeployment(deploymentInputs(binding, 'd'.repeat(40), { codeSha: CODE, contentSha: 'd'.repeat(40) }));
});

test('integrated Admin real commit and dispatch satisfy composed deployment inputs', async () => {
  const file = 'public/site/data/site-navigation.json';
  const mock = githubMock({ [file]: '{"items":[]}' });
  const operation = createStagingOperation(config(), { scope: 'navigation', fetch: mock.fetch });
  const current = await operation.getTextFile(file);
  await operation.putTextFile(file, '{"items":["fixture"]}', current.sha, 'fixture');
  await operation.finish({ dispatch: true });
  const dispatch = mock.calls.find(c => c.path.endsWith('/dispatches'));
  assert.equal(dispatch.body.ref, 'main'); acceptsDeployment(dispatch.body.inputs);
  assert.deepEqual(mock.calls.filter(c => c.method === 'PATCH').map(c => [c.path, c.body.force]),
    [['/git/refs/heads/content%2Fstaging', false]]);
});

test('integrated Portal real save dispatch satisfies composed deployment inputs', async () => {
  const mock = githubFixture();
  const session = await loginSession(resolveEnvironment('www-test.distillery.de'),
    { id: 'fixture-resident', invite: 'fixture-invite' }, fixtureResident(), 'FIXTURE-CODE',
    'TEST-ONLY-NOT-A-GITHUB-CREDENTIAL', mock.fetcher);
  session.setViewBaseline(session.resident);
  await session.save({ ...session.resident, city: 'Fixture city' });
  const dispatch = mock.calls.find(c => c.url.endsWith('/dispatches'));
  assert.equal(dispatch.body.ref, 'main'); acceptsDeployment(dispatch.body.inputs);
  assert(mock.calls.filter(c => c.method === 'PATCH').every(c => c.url.endsWith('/content/staging') && c.body.force === false));
});

test('integrated WordPress no-change has no publication or deployment mutation', async () => {
  const api = () => assert.fail('No PR or deployment writes expected'); api.all = async () => [];
  const result = await publishStagingNews({ prepared: { revision: { codeSha: CODE, contentSha: CONTENT },
    summary: { hasChanges: false } }, api, checkHeads: () => {},
    createCommit: () => assert.fail('commit'), push: () => assert.fail('push') });
  assert.equal(result.action, 'no-change');
});

test('integrated environment contracts reject live and free branch routing', () => {
  for (const mode of ['validate-only', 'sync-pr']) assert.throws(() => writerEnvironment('live', mode), /not activated/);
  assert.throws(() => settings({ ...config(), environment: 'live' }), /not activated/);
  assert.throws(() => settings({ ...config(), branch: 'main' }), /content\/staging/);
  assert.throws(() => assertWritable(resolveEnvironment('www.distillery.de')), /not activated/);
  assert.throws(() => resolveEnvironment('www-test.distillery.de', '?branch=content%2Fstaging'), /branch/);
  assert.throws(() => stagingEnvironment('live'), /not activated/);
});

test('integrating Portal does not remove the read-only Admin Access owner', () => {
  const source = readFileSync(new URL('../public/admin/extensions/resident-access.js', import.meta.url), 'utf8');
  assert.match(source, /button.disabled = true/);
  assert.doesNotMatch(source, /autoSaveResidents|clipboard|https:\/\//);
});

test('shared staging sitemap survives News then Admin image generation without foreign-family loss', () => {
  const event = { id: 'fm-11111111-2222-3333-4444-555555555555', date: '2026-10-16', title: 'Fixture', sections: [] };
  const document = { events: [event] };
  const residentBlock = '<url><loc>https://www.distillery.de/residents/staging-only/</loc></url>';
  const initial = updateEventSitemap('<?xml version="1.0"?><urlset>' + residentBlock
    + '<url><loc>https://www.distillery.de/news/</loc></url></urlset>', document.events);
  const news = updateNewsSitemap(initial, [{ slug: 'staging-news', publishedAt: '2026-09-01' }]);
  const plan = buildEventImageOnlySavePlan({ freshDocument: document, freshManifest: storageArtifacts(document).storage.manifest,
    currentSitemap: news, targetEventId: event.id, requestedImageUrl: 'public/events/media/fixture/poster.jpg' });
  const result = plan.files.get('sitemap.xml') || news;
  assert(result.includes(residentBlock)); assert(result.includes('/news/staging-news/'));
  assert(result.includes('/events/' + event.id + '/'));
});
