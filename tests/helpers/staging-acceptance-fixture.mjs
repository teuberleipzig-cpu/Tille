import assert from 'node:assert/strict';

export function acceptanceFixture() {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05'].map(key => ({
    key, path: `public/events/data/months/${key}.json`, count: 1
  }));
  const documents = {
    '/public/site/data/site-navigation.json': { schemaVersion: 1, homePage: 'dates', pages: [
      { id: 'dates', order: 1, enabled: true, available: true, href: 'index.html' },
      { id: 'fixture', order: 2, enabled: true, available: true, href: 'fixture.html?view=all' },
      { id: 'disabled', order: 3, enabled: false, available: true, href: 'disabled.html' },
      { id: 'external', order: 4, enabled: true, available: true, href: 'https://example.com/' }
    ] },
    '/public/events/data/manifest.json': { schemaVersion: 1, totalEvents: 5, months },
    '/public/residents/data/residents.json': { residents: [{ id: 'fixture', portal: {
      code: 'PRIVATE-FIXTURE-CODE', inviteId: 'PRIVATE-FIXTURE-INVITE'
    } }] }
  };
  for (const month of months) documents['/' + month.path] = { events: [{ id: `fixture-${month.key}` }] };
  const bodies = Object.fromEntries(['/', '/index.html', '/about.html', '/contact.html', '/history.html',
    '/news.html', '/residents.html', '/feedback.html', '/gallery.html', '/fixture.html',
    '/events/fixture-2026-01/'].map(path => [path, '<!doctype html><html>Fixture</html>']));
  Object.assign(bodies, {
    '/public/admin/': '<select id="adminEnvironment"></select><div id="eventList"></div><script src="./js/admin-app.js?v=fixture"></script>',
    '/public/resident-portal/': '<div id="loginScreen"></div><div id="portalStatus"></div><script type="module" src="./js/app-coverfix.js?v=fixture"></script>',
    '/public/admin/js/admin-app.js': '// fixture', '/public/resident-portal/js/app-coverfix.js': '// fixture',
    '/public/admin/css/admin.css': 'body{}', '/public/resident-portal/css/portal.css': 'body{}'
  });
  return { documents, bodies };
}

export function acceptanceFetch(fixture = acceptanceFixture(), overrides = {}, calls = []) {
  return async (url, options) => {
    const parsed = new URL(url);
    calls.push(parsed);
    assert.equal(parsed.origin, 'https://www-test.distillery.de');
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    assert.ok(!options.method || options.method === 'GET');
    const path = parsed.pathname, json = Object.hasOwn(fixture.documents, path);
    const body = json ? JSON.stringify(fixture.documents[path]) : fixture.bodies[path];
    const config = { status: body === undefined ? 404 : 200, body: body ?? 'not-found',
      headers: { 'x-robots-tag': 'noindex, nofollow, noarchive',
        'cache-control': path.endsWith('.json') ? 'no-store' : 'no-cache' }, ...overrides[path] };
    return new Response(config.body, { status: config.status, headers: config.headers });
  };
}
