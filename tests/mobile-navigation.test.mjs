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
const foundation = await readFile(new URL('assets/mobile-foundation.css', root), 'utf8');
const publicPages = ['404.html','about.html','contact.html','datenschutz.html','event.html','feedback-thanks.html','feedback.html','gallery.html','history.html','impressum.html','index.html','news.html','news/index.html','resident-releases.html','residents.html'];

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
  assert.match(mobile, /aria-modal/);
  assert.match(mobile, /event\.key === 'Escape'/);
  assert.match(mobile, /event\.key !== 'Tab'/);
  assert.match(mobile, /event\.shiftKey/);
  assert.match(mobile, /event\.preventDefault\(\)/);
  assert.match(mobile, /close\.focus\(\)/);
  assert.match(mobile, /toggle\.focus\(\)/);
});

test('mobile navigation meets touch, safe-area and reduced-motion contracts', () => {
  assert.match(css, /site-mobile-toggle[^}]+width:48px;height:48px/);
  assert.match(css, /site-mobile-close[^}]+width:48px;height:48px/);
  assert.match(css, /site-mobile-links a[^}]+min-height:52px/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-right\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(mobile, /media\.addEventListener\('change'/);
  assert.match(mobile, /setOpen\(false\)/);
});

test('mobile foundation covers forms, residents, gallery and focus visibility', () => {
  assert.match(foundation, /:focus-visible/);
  assert.match(foundation, /feedback-form input,.feedback-form select\{min-height:48px;font-size:16px\}/);
  assert.match(foundation, /feedback-form textarea\{font-size:16px;line-height:1\.45\}/);
  assert.match(foundation, /submit-button\{min-height:52px;font-size:16px\}/);
  assert.match(foundation, /social-icon\{width:48px;height:48px/);
  assert.match(foundation, /profile-tab\{min-height:44px/);
  assert.match(foundation, /lightbox button\{min-width:48px;min-height:48px\}/);
});

test('all public navigation pages use consistent cache versions', async () => {
  for (const name of publicPages) {
    const html = await readFile(new URL(name, root), 'utf8');
    assert.match(html, /site-navigation\.js\?v=site-navigation-5/);
    assert.doesNotMatch(html, /site-navigation\.js\?v=site-navigation-[1-4]/);
    assert.match(html, /mobile-navigation\.css\?v=mobile-navigation-2/);
    assert.match(html, /mobile-foundation\.css\?v=mobile-foundation-1/);
  }
});
