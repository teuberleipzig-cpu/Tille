import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { moveSitePage, normalizeSiteNavigation, SITE_PAGE_IDS } from '../public/site/js/site-navigation-model.js';

const source = JSON.parse(await readFile(new URL('../public/site/data/site-navigation.json', import.meta.url), 'utf8'));

test('default navigation contains every supported page once', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.map(page => page.id).sort(), [...SITE_PAGE_IDS].sort());
});

test('default public navigation matches existing seven links', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.filter(page => page.enabled).map(page => page.id), ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback']);
  assert.equal(config.homePage, 'dates');
});

test('future page types remain disabled', () => {
  const config = normalizeSiteNavigation(source);
  assert.deepEqual(config.pages.filter(page => !page.enabled).map(page => page.id), ['gallery', 'team', 'podcast', 'merch']);
});

test('duplicate ids are rejected', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, pages: [...source.pages, source.pages[0]] }), /eindeutig/);
});

test('empty enabled set is rejected', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, pages: source.pages.map(page => ({ ...page, enabled: false })) }), /Mindestens/);
});

test('inactive home page is rejected', () => {
  assert.throws(() => normalizeSiteNavigation({ ...source, homePage: 'gallery' }), /Startseite/);
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
