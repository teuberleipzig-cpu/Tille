import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { enabledMobilePages } from '../public/site/js/mobile-navigation.js';
import { normalizeSiteNavigation } from '../public/site/js/site-navigation-model.js';

const root = new URL('../', import.meta.url);
const config = normalizeSiteNavigation(JSON.parse(await readFile(new URL('public/site/data/site-navigation.json', root), 'utf8')));
const owner = await readFile(new URL('assets/site-navigation.js', root), 'utf8');
const mobile = await readFile(new URL('public/site/js/mobile-navigation.js', root), 'utf8');
const css = await readFile(new URL('assets/mobile-navigation.css', root), 'utf8');
const publicPages = ['404.html','about.html','contact.html','datenschutz.html','event.html','feedback-thanks.html','feedback.html','gallery.html','history.html','impressum.html','index.html','news.html','resident-releases.html','residents.html'];

test('mobile drawer uses enabled navigation pages in configured order', () => {
  assert.deepEqual(enabledMobilePages(config).map(page => page.id), ['dates','news','residents','about','contact','history','feedback','gallery']);
});

test('future disabled pages are absent from the mobile drawer model', () => {
  assert.deepEqual(enabledMobilePages(config).filter(page => ['team','podcast','merch'].includes(page.id)), []);
});

test('shared owner performs the only navigation config request', () => {
  assert.equal((owner.match(/fetch\(/g) || []).length, 1);
  assert.doesNotMatch(mobile, /fetch\(/);
  assert.match(owner, /initialiseMobileNavigation\(config, currentPageId\(\), nav\)/);
});

test('drawer readiness is fail-safe and initialization is idempotent', () => {
  assert.match(css, /html\.mobile-navigation-ready \.nav\{display:none\}/);
  assert.match(mobile, /if \(!pages\.length\) return false/);
  assert.match(mobile, /root\.mobileNavigationDestroy\?\.\(\)/);
  assert.match(mobile, /root\.remove\(\)/);
  assert.ok(mobile.indexOf("document.body.append(root)") < mobile.indexOf("classList.add(ROOT_READY_CLASS)"));
});

test('hamburger and drawer expose required accessibility controls', () => {
  for (const value of ['aria-label', 'aria-expanded', 'aria-controls', 'aria-hidden', 'aria-current']) assert.match(mobile, new RegExp(value));
  assert.match(mobile, /event\.key === 'Escape'/);
  assert.match(mobile, /close\.focus\(\)/);
  assert.match(mobile, /toggle\.focus\(\)/);
});

test('all public navigation pages use consistent cache versions', async () => {
  for (const name of publicPages) {
    const html = await readFile(new URL(name, root), 'utf8');
    assert.match(html, /site-navigation\.js\?v=site-navigation-4/);
    assert.doesNotMatch(html, /site-navigation\.js\?v=site-navigation-2/);
    assert.match(html, /mobile-navigation\.css\?v=mobile-navigation-1/);
  }
});
