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

test('default public navigation matches existing seven links', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.filter(page => page.enabled).map(page => page.id), ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback']);
  assert.deepEqual(config.pages.filter(page => page.available).map(page => page.id), ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback']);
  assert.equal(config.homePage, 'dates');
});

test('future page types remain unavailable and disabled', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.filter(page => !page.available).map(page => page.id), ['gallery', 'team', 'podcast', 'merch']);
  assert.deepEqual(config.pages.filter(page => !page.enabled).map(page => page.id), ['gallery', 'team', 'podcast', 'merch']);
});

test('unavailable page cannot be enabled', () => {
  const pages = source.pages.map(page => page.id === 'gallery' ? { ...page, enabled: true } : page);
  assert.throws(() => normalizeSiteNavigation({ ...source, pages }), /nicht aktiviert/);
});

test('unavailable page cannot be home page', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, homePage: 'gallery' }), /verfügbare und aktive/);
});

test('available disabled page is valid when it is not home page', () => {
  const pages = source.pages.map(page => page.id === 'news' ? { ...page, enabled: false } : page);
  assert.equal(normalizeSiteNavigation({ ...source, pages }).pages.find(page => page.id === 'news').enabled, false);
});

test('available enabled page can be home page', () => {
  assert.equal(normalizeSiteNavigation({ ...source, homePage: 'news' }).homePage, 'news');
});

test('missing availability uses safe compatibility defaults', () => {
  const pages = source.pages.map(({ available, ...page }) => page);
  const config = normalizeSiteNavigation({ ...source, pages });
  assert.equal(config.pages.find(page => page.id === 'dates').available, true);
  assert.equal(config.pages.find(page => page.id === 'gallery').available, false);
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
  const config = moveSitePage(source, 'news', -1);
  assert.deepEqual(config.pages.slice(0, 2).map(page => page.id), ['news', 'dates']);
  assert.deepEqual(config.pages.map(page => page.order), Array.from({ length: SITE_PAGE_IDS.length }, (_, index) => index + 1));
});

test('unavailable page can still move in prepared order', () => {
  const config = moveSitePage(source, 'gallery', -1);
  assert.equal(config.pages[6].id, 'gallery');
  assert.equal(config.pages[6].available, false);
});

test('admin marks unavailable controls disabled without disabling order controls', () => {
  assert.match(adminSource, /Noch nicht verfügbar/);
  assert.match(adminSource, /data-site-enabled[^>]*page\.available \? '' : 'disabled'/);
  assert.match(adminSource, /data-site-home[^>]*page\.available \? '' : 'disabled'/);
  assert.doesNotMatch(adminSource, /data-site-up[^>]*page\.available/);
  assert.doesNotMatch(adminSource, /data-site-down[^>]*page\.available/);
});
