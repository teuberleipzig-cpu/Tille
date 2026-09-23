import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyStagingAcceptance } from '../scripts/content/staging-acceptance.mjs';
import { acceptanceFetch, acceptanceFixture } from './helpers/staging-acceptance-fixture.mjs';

const NAV = '/public/site/data/site-navigation.json';
const MANIFEST = '/public/events/data/manifest.json';
const RESIDENTS = '/public/residents/data/residents.json';
const MONTH = '/public/events/data/months/2026-01.json';
const run = (fixture, overrides = {}, calls = []) => verifyStagingAcceptance({
  fetchImpl: acceptanceFetch(fixture, overrides, calls), query: '123-1-1'
});

test('all pages, JSON invariants, apps and main assets pass with staging headers and GET only', async () => {
  const calls = [];
  assert.deepEqual(await run(acceptanceFixture(), {}, calls), { valid: true });
  for (const path of ['/', '/index.html', '/about.html', '/contact.html', '/history.html', '/news.html',
    '/residents.html', '/feedback.html', '/gallery.html', '/public/admin/', '/public/resident-portal/',
    '/public/admin/js/admin-app.js', '/public/resident-portal/js/app-coverfix.js',
    '/public/admin/css/admin.css', '/public/resident-portal/css/portal.css', NAV, MANIFEST, RESIDENTS,
    '/events/fixture-2026-01/']) assert.ok(calls.some(url => url.pathname === path), path);
  assert.ok(calls.every(url => url.searchParams.get('deploy_verify') === '123-1-1'));
  assert.equal(calls.find(url => url.pathname === '/fixture.html').searchParams.get('view'), 'all');
  assert.equal(calls.find(url => url.pathname === '/public/admin/js/admin-app.js').searchParams.get('v'), 'fixture');
  assert.ok(!calls.some(url => url.pathname === '/disabled.html'));
  assert.deepEqual(calls.filter(url => url.pathname.includes('/months/')).map(url => url.pathname),
    ['2026-01', '2026-03', '2026-05'].map(key => `/public/events/data/months/${key}.json`));
});

for (const count of [0, 1, 2]) {
  test(`month sampling deduplicates a ${count}-month manifest`, async () => {
    const fixture = acceptanceFixture(), manifest = fixture.documents[MANIFEST], calls = [];
    manifest.months = manifest.months.slice(0, count); manifest.totalEvents = count;
    await run(fixture, {}, calls);
    assert.deepEqual(calls.filter(url => url.pathname.includes('/months/')).map(url => url.pathname),
      manifest.months.map(month => '/' + month.path));
    assert.equal(calls.some(url => url.pathname.startsWith('/events/')), count > 0);
  });
}

test('sampling is chronological even when manifest entries are reordered', async () => {
  const fixture = acceptanceFixture(), calls = [];
  fixture.documents[MANIFEST].months.reverse();
  await run(fixture, {}, calls);
  assert.deepEqual(calls.filter(url => url.pathname.includes('/months/')).map(url => url.pathname),
    ['2026-01', '2026-03', '2026-05'].map(key => `/public/events/data/months/${key}.json`));
});

test('empty samples use the fixed event index without fetching a fourth month', async () => {
  const fixture = acceptanceFixture(), calls = [];
  for (const index of [0, 2, 4]) {
    const month = fixture.documents[MANIFEST].months[index]; month.count = 0;
    fixture.documents['/' + month.path].events = [];
  }
  fixture.documents[MANIFEST].totalEvents = 2;
  fixture.documents['/public/events/data/event-index.json'] = { events: [{ id: 'fixture-2026-02', month: '2026-02' }] };
  fixture.bodies['/events/fixture-2026-02/'] = '<html>Fixture</html>';
  await run(fixture, {}, calls);
  assert.equal(new Set(calls.filter(url => url.pathname.includes('/months/')).map(url => url.pathname)).size, 3);
  assert.ok(calls.some(url => url.pathname === '/events/fixture-2026-02/'));
});

for (const path of ['/about.html', '/public/admin/', '/public/resident-portal/',
  '/public/admin/js/admin-app.js', '/public/resident-portal/js/app-coverfix.js', '/events/fixture-2026-01/']) {
  for (const status of [404, 500, 302]) test(`${path} HTTP ${status} fails closed`, async () => {
    await assert.rejects(run(acceptanceFixture(), { [path]: { status } }), /expected HTTP 200 without redirect/);
  });
}

for (const [name, patch] of [
  ['noindex missing', { headers: { 'x-robots-tag': 'nofollow,noarchive', 'cache-control': 'no-cache' } }],
  ['nofollow missing', { headers: { 'x-robots-tag': 'noindex,noarchive', 'cache-control': 'no-cache' } }],
  ['noarchive missing', { headers: { 'x-robots-tag': 'noindex,nofollow', 'cache-control': 'no-cache' } }],
  ['HTML cache policy wrong', { headers: { 'x-robots-tag': 'noindex,nofollow,noarchive', 'cache-control': 'public' } }]
]) test(name, async () => {
  await assert.rejects(run(acceptanceFixture(), { '/about.html': patch }), /missing/);
});

for (const path of [NAV, MANIFEST, RESIDENTS, MONTH]) {
  test(`${path} invalid JSON is redacted`, async () => {
    await assert.rejects(run(acceptanceFixture(), { [path]: { body: '{PRIVATE-FIXTURE-CODE' } }), error =>
      error.message.includes('invalid JSON') && !error.message.includes('PRIVATE-FIXTURE'));
  });
  test(`${path} requires no-store`, async () => {
    await assert.rejects(run(acceptanceFixture(), { [path]: { headers: {
      'x-robots-tag': 'noindex,nofollow,noarchive', 'cache-control': 'no-cache'
    } } }), /missing no-store/);
  });
}

const invalidStructures = [
  ['duplicate navigation ID', f => { f[NAV].pages[1].id = 'dates'; }, /duplicate ID/],
  ['unregistered homePage', f => { f[NAV].homePage = 'missing'; }, /homePage/],
  ['negative order', f => { f[NAV].pages[0].order = -1; }, /invalid order/],
  ['fractional order', f => { f[NAV].pages[0].order = 1.5; }, /invalid order/],
  ['empty pages', f => { f[NAV].pages = []; }, /schema/],
  ['navigation schema', f => { f[NAV].schemaVersion = 2; }, /schema/],
  ['manifest schema', f => { f[MANIFEST].schemaVersion = 2; }, /schema/],
  ['negative total', f => { f[MANIFEST].totalEvents = -1; }, /schema/],
  ['negative count', f => { f[MANIFEST].months[0].count = -1; }, /invalid month count/],
  ['duplicate month', f => { f[MANIFEST].months.push(f[MANIFEST].months[0]); }, /duplicate month/],
  ['manifest count mismatch', f => { f[MONTH].events = []; }, /manifest count mismatch/],
  ['total count mismatch', f => { f[MANIFEST].totalEvents = 100; }, /totalEvents/],
  ['duplicate event ID', f => { f[MONTH].events.push(f[MONTH].events[0]); f[MANIFEST].months[0].count++; f[MANIFEST].totalEvents++; }, /duplicate ID/],
  ['duplicate resident ID', f => { f[RESIDENTS].residents.push(f[RESIDENTS].residents[0]); }, /duplicate ID/],
  ['blank resident ID', f => { f[RESIDENTS].residents[0].id = ' '; }, /invalid ID/],
  ['resident array missing', f => { delete f[RESIDENTS].residents; }, /residents must/],
  ['events array missing', f => { delete f[MONTH].events; }, /events must/]
];
for (const [name, change, pattern] of invalidStructures) test(name, async () => {
  const fixture = acceptanceFixture(); change(fixture.documents);
  await assert.rejects(run(fixture), error => pattern.test(error.message)
    && !error.message.includes('PRIVATE-FIXTURE'));
});

for (const path of ['../residents.json', 'public/events/data/months/../../secret.json',
  'public/events/data/months/%2e%2e/secret.json', 'https://example.com/secret',
  '//example.com/secret', 'public\\events\\data\\months\\2026-01.json']) {
  test(`unsafe manifest path rejected before request: ${path}`, async () => {
    const fixture = acceptanceFixture(), calls = [];
    fixture.documents[MANIFEST].months[0].path = path;
    await assert.rejects(run(fixture, {}, calls), /unsafe manifest path/);
    assert.ok(!calls.some(url => url.pathname.includes('/months/') || url.pathname.includes('secret')));
  });
}

for (const href of ['../secret', '//example.com/', 'data:text/plain,secret', 'javascript:alert(1)',
  '/%2e%2e/secret', 'https://www-test.distillery.de/../secret']) {
  test('unsafe enabled navigation href rejected', async () => {
    const fixture = acceptanceFixture(); fixture.documents[NAV].pages[0].href = href;
    await assert.rejects(run(fixture), /unsafe internal path/);
  });
}

test('main script and app markers are mandatory, CSS must revalidate', async () => {
  for (const path of ['/public/admin/', '/public/resident-portal/']) {
    await assert.rejects(run(acceptanceFixture(), { [path]: { body: '<html>fallback</html>' } }), /missing app marker/);
    const fixture = acceptanceFixture(); fixture.bodies[path] = fixture.bodies[path].replace(/<script[^]*<\/script>/, '');
    await assert.rejects(run(fixture), /missing main script/);
  }
  await assert.rejects(run(acceptanceFixture(), { '/public/admin/css/admin.css': { headers: {
    'x-robots-tag': 'noindex,nofollow,noarchive', 'cache-control': 'max-age=999'
  } } }), /missing no-cache/);
});

test('transport/body failures and resident metadata cannot leak into errors or results', async () => {
  const secret = 'PRIVATE-FIXTURE-CODE PRIVATE-FIXTURE-INVITE';
  for (const fetchImpl of [async () => { throw new Error(secret); }, async () => ({
    status: 200, headers: new Headers({ 'x-robots-tag': 'noindex,nofollow,noarchive', 'cache-control': 'no-cache' }),
    text: async () => { throw new Error(secret); }
  })]) {
    await assert.rejects(verifyStagingAcceptance({ fetchImpl, query: '123-1-1' }), error =>
      /Staging acceptance \//.test(error.message) && !error.message.includes('PRIVATE-FIXTURE'));
  }
  assert.ok(!JSON.stringify(await run(acceptanceFixture())).includes('PRIVATE-FIXTURE'));
});

test('invalid probe identity causes no requests', async () => {
  await assert.rejects(verifyStagingAcceptance({ query: 'bad&url', fetchImpl: () => assert.fail('network') }), /identity/);
});

test('PR smoke includes acceptance sources/tests and remains read-only without publish or SSH', () => {
  const workflow = readFileSync(new URL('../.github/workflows/staging-container-smoke.yml', import.meta.url), 'utf8');
  assert.ok(workflow.includes("'scripts/content/**'"));
  assert.ok(workflow.includes("'tests/staging-acceptance.test.mjs'"));
  assert.ok(workflow.includes("'tests/helpers/staging-acceptance-fixture.mjs'"));
  assert.match(workflow, /node --test tests\/staging-acceptance.test.mjs/);
  assert.match(workflow, /contents: read/);
  assert.doesNotMatch(workflow, /docker\/login-action|docker push|push: true|ssh-action|gh workflow run/);
});
