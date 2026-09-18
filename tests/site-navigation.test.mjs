import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { moveSitePage, normalizeSiteNavigation, SITE_PAGE_IDS } from '../public/site/js/site-navigation-model.js';

const source = JSON.parse(await readFile(new URL('../public/site/data/site-navigation.json', import.meta.url), 'utf8'));
const adminSource = await readFile(new URL('../public/admin/js/features/site-navigation/site-navigation.js', import.meta.url), 'utf8');

test('default navigation contains every supported page once', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.map(page => page.id).sort(), [...SITE_PAGE_IDS].sort());
});

test('committed navigation is valid and enabled pages are available', () => {
  const config = normalizeSiteNavigation(source);
  assert.equal(config.homePage, 'dates');
  assert.equal(config.pages.find(page => page.id === config.homePage)?.enabled, true);
  assert.deepEqual(
    config.pages.filter(page => page.available).map(page => page.id).sort(),
    ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback', 'gallery'].sort()
  );
  assert.ok(config.pages.filter(page => page.enabled).every(page => page.available));
});

test('remaining future page types stay unavailable and cannot be enabled', () => {
  const config = normalizeSiteNavigation(source);
  const unavailable = config.pages.filter(page => !page.available);
  assert.deepEqual(unavailable.map(page => page.id), ['team', 'podcast', 'merch']);
  assert.ok(unavailable.every(page => page.enabled === false));
});

test('unavailable page cannot be enabled', () => {
  const pages = source.pages.map(page => page.id === 'team' ? { ...page, enabled: true } : page);
  assert.throws(() => normalizeSiteNavigation({ ...source, pages }), /nicht aktiviert/);
});

test('unavailable page cannot be home page', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, homePage: 'team' }), /verfügbare und aktive/);
});

test('available disabled page is valid when it is not home page', () => {
  const pages = source.pages.map(page => page.id === 'news' ? { ...page, enabled: false } : page);
  assert.equal(normalizeSiteNavigation({ ...source, pages }).pages.find(page => page.id === 'news').enabled, false);
});

test('available enabled page can be home page', () => {
  const pages = source.pages.map(page => page.id === 'news' ? { ...page, enabled: true } : page);
  assert.equal(normalizeSiteNavigation({ ...source, pages, homePage: 'news' }).homePage, 'news');
});

test('missing availability uses safe compatibility defaults', () => {
  const pages = source.pages.map(({ available, ...page }) => page.id === 'gallery' ? { ...page, enabled: false } : page);
  const config = normalizeSiteNavigation({ ...source, pages });
  assert.equal(config.pages.find(page => page.id === 'dates').available, true);
  assert.equal(config.pages.find(page => page.id === 'team').available, false);
});

test('duplicate ids are rejected', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, pages: [...source.pages, source.pages[0]] }), /eindeutig/);
});

test('empty enabled set is rejected', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, pages: source.pages.map(page => ({ ...page, enabled: false })) }), /Mindestens/);
});

test('inactive home page is rejected', () => {
  const pages = source.pages.map(page => page.id === 'feedback' ? { ...page, enabled: false } : page);
  assert.throws(() => normalizeSiteNavigation({ ...source, pages, homePage: 'feedback' }), /Startseite/);
});

test('unknown fields survive normalization', () => {
  const config = normalizeSiteNavigation({ ...source, future: 'kept', pages: source.pages.map(page => page.id === 'dates' ? { ...page, futurePageField: 7 } : page) });
  assert.equal(config.future, 'kept');
  assert.equal(config.pages.find(page => page.id === 'dates').futurePageField, 7);
});

test('moving a page normalizes unique order values', () => {
  const before = normalizeSiteNavigation(source);
  const movingId = before.pages[1].id;
  const firstId = before.pages[0].id;
  const config = moveSitePage(source, movingId, -1);
  assert.deepEqual(config.pages.slice(0, 2).map(page => page.id), [movingId, firstId]);
  assert.deepEqual(config.pages.map(page => page.order), Array.from({ length: SITE_PAGE_IDS.length }, (_, index) => index + 1));
});

test('unavailable page can still move in prepared order', () => {
  const before = normalizeSiteNavigation(source);
  const index = before.pages.findIndex(page => page.id === 'team');
  const offset = index > 0 ? -1 : 1;
  const target = index + offset;
  const config = moveSitePage(source, 'team', offset);
  assert.equal(config.pages[target].id, 'team');
  assert.equal(config.pages[target].available, false);
});

test('admin marks unavailable controls disabled without disabling order controls', () => {
  assert.match(adminSource, /Noch nicht verfügbar/);
  assert.match(adminSource, /data-site-enabled[^>]*page\.available \? '' : 'disabled'/);
  assert.match(adminSource, /data-site-home[^>]*page\.available \? '' : 'disabled'/);
  assert.doesNotMatch(adminSource, /data-site-up[^>]*page\.available/);
  assert.doesNotMatch(adminSource, /data-site-down[^>]*page\.available/);
});
