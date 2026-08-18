import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ART_STATE_COUNT, chooseArtState, enabledMobilePages } from '../public/site/js/mobile-navigation.js';
import { normalizeSiteNavigation } from '../public/site/js/site-navigation-model.js';

const root = new URL('../', import.meta.url);
const config = normalizeSiteNavigation(JSON.parse(await readFile(new URL('public/site/data/site-navigation.json', root), 'utf8')));
const owner = await readFile(new URL('assets/site-navigation.js', root), 'utf8');
const mobile = await readFile(new URL('public/site/js/mobile-navigation.js', root), 'utf8');
const css = await readFile(new URL('assets/mobile-navigation.css', root), 'utf8');
const foundation = await readFile(new URL('assets/mobile-foundation.css', root), 'utf8');
const publicPages = ['404.html','about.html','contact.html','datenschutz.html','event.html','feedback-thanks.html','feedback.html','gallery.html','history.html','impressum.html','index.html','news.html','news/index.html','resident-releases.html','residents.html'];

test('official Distillery D asset is byte-identical and self-contained', async () => {
  const asset = await readFile(new URL('assets/distillery-d.svg', root));
  const svg = asset.toString('utf8');
  assert.equal(createHash('sha256').update(asset).digest('hex'), '01edd286f356abd05efeb2735d360c1af15f55283a098dcaa9310dacbca1dad8');
  assert.match(svg, /<svg\b/);
  assert.match(svg, /viewBox="0 0 240\.16 177\.36"/);
  assert.doesNotMatch(svg, /<script\b|javascript:|(?:href|src)\s*=\s*["']https?:\/\//i);
});

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
  assert.match(mobile, /for \(let line = 0; line < 3; line \+= 1\) toggle\.append\(document\.createElement\('span'\)\)/);
  for (const value of ['aria-label', 'aria-expanded', 'aria-controls', 'aria-hidden', 'aria-current']) assert.match(mobile, new RegExp(value));
  assert.match(mobile, /aria-modal/);
  assert.match(mobile, /event\.key === 'Escape'/);
  assert.match(mobile, /event\.key !== 'Tab'/);
  assert.match(mobile, /event\.shiftKey/);
  assert.match(mobile, /event\.preventDefault\(\)/);
  assert.match(mobile, /close\.focus\(\)/);
  assert.match(mobile, /toggle\.focus\(\)/);
});

test('hamburger has exactly eight three-line art state contracts', () => {
  assert.match(css, /site-mobile-toggle span\{[^}]*position:absolute;[^}]*width:21px;height:2px;[^}]*transition:[^}]*\.22s ease/);
  assert.match(css, /site-mobile-toggle span:nth-child\(1\)\{transform:translateY\(-6px\)\}/);
  assert.match(css, /site-mobile-toggle span:nth-child\(3\)\{transform:translateY\(6px\)\}/);
  assert.doesNotMatch(mobile, /toggleMark|site-mobile-toggle-mark/);
  assert.doesNotMatch(css, /site-mobile-toggle-mark/);
  assert.match(css, /is-open \.site-mobile-toggle span\{opacity:1\}/);
  const contracts = [...css.matchAll(/data-art-state="(\d)"\] span:nth-child\(([123])\)/g)].map(match => `${match[1]}:${match[2]}`);
  assert.equal(contracts.length, 24);
  for (let state = 0; state < ART_STATE_COUNT; state += 1) {
    assert.deepEqual(contracts.filter(contract => contract.startsWith(`${state}:`)), [`${state}:1`,`${state}:2`,`${state}:3`]);
  }
  assert.match(css, /data-art-state="0"\] span:nth-child\(1\)\{[^}]*width:31px;transform:rotate\(82deg\)/);
  assert.match(css, /data-art-state="0"\] span:nth-child\(2\)\{[^}]*width:31px;transform:rotate\(77deg\)/);
  assert.match(css, /data-art-state="0"\] span:nth-child\(3\)\{[^}]*width:42px;transform:rotate\(-43deg\)/);
  assert.match(css, /prefers-reduced-motion:reduce[^}]+site-mobile-toggle span\{transition:none\}/);
});

test('art state helper reaches all states without direct repetition', () => {
  assert.equal(ART_STATE_COUNT, 8);
  assert.deepEqual(Array.from({ length: 8 }, (_, index) => chooseArtState(null, (index + 0.25) / 8)), [0,1,2,3,4,5,6,7]);
  for (let previous = 0; previous < ART_STATE_COUNT; previous += 1) {
    const choices = Array.from({ length: 7 }, (_, index) => chooseArtState(previous, (index + 0.25) / 7));
    assert.equal(choices.includes(previous), false);
    assert.deepEqual(new Set(choices), new Set(Array.from({ length: 8 }, (_, state) => state).filter(state => state !== previous)));
  }
});

test('art state selection occurs only on a closed to open transition', () => {
  assert.match(mobile, /const wasOpen = toggle\.getAttribute\('aria-expanded'\) === 'true'/);
  assert.match(mobile, /if \(open && !wasOpen\) \{\s*previousArtState = chooseArtState\(previousArtState\);\s*toggle\.dataset\.artState = String\(previousArtState\)/);
  assert.doesNotMatch(mobile, /localStorage|sessionStorage|document\.cookie|URLSearchParams/);
  assert.doesNotMatch(mobile, /setInterval|MutationObserver|canvas|createElement\(['"](?:img|svg)['"]\)/);
});

test('mobile header moves and restores the single existing logo deterministically', () => {
  assert.match(mobile, /document\.querySelector\('header\.logo'\)/);
  assert.doesNotMatch(mobile, /cloneNode/);
  assert.match(mobile, /header\.prepend\(logo\)/);
  assert.match(mobile, /logoAnchor\.after\(logo\)/);
  assert.match(mobile, /root\.mobileNavigationDestroy = \(\) => \{[\s\S]*restoreLogo\(\)[\s\S]*logoAnchor\.remove\(\)/);
  assert.match(mobile, /updateMobileState\(media\.matches\)/);
  assert.match(mobile, /window\.addEventListener\('scroll', updateScrollState, scrollListenerOptions\)/);
  assert.match(mobile, /passive: true/);
  assert.doesNotMatch(mobile, /setInterval|MutationObserver/);
  assert.match(css, /site-mobile-header\{position:fixed;top:0;left:0;right:0/);
  assert.match(css, /site-mobile-logo-anchor\{display:block;height:86px\}/);
  assert.match(css, /@media\(max-width:480px\)/);
  assert.match(css, /\.site-mobile-header \.logo,\.site-mobile-header \.logo img\{width:min\(280px,calc\(100vw - 92px\)\)\}/);
  assert.match(css, /site-mobile-header\.site-mobile-header-scrolled \.logo img\{filter:invert\(1\)\}/);
  assert.doesNotMatch(css, /site-mobile-header\.site-mobile-header-scrolled \.site-mobile-toggle/);
});

test('official D favicon and manifest are root absolute on every public page', async () => {
  for (const name of publicPages) {
    const html = await readFile(new URL(name, root), 'utf8');
    assert.match(html, /<link rel="icon" href="\/assets\/distillery-d\.svg" type="image\/svg\+xml">/);
    assert.doesNotMatch(html, /rel="icon"[^>]+favicon\.svg/);
  }
  const manifest = JSON.parse(await readFile(new URL('site.webmanifest', root), 'utf8'));
  assert.deepEqual(manifest.icons[0], { src: '/assets/distillery-d.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' });
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
  assert.match(foundation, /:focus-visible[^}]+outline:3px solid #000;outline-offset:3px/);
  assert.match(css, /site-mobile-toggle:focus-visible,.site-mobile-close:focus-visible,.site-mobile-links a:focus-visible\{outline:3px solid #e49a78/);
  assert.match(foundation, /lightbox button:focus-visible\{outline-color:#e49a78\}/);
  assert.doesNotMatch(`${foundation}\n${css}`, /:focus(?!-visible)/);
  assert.match(foundation, /feedback-form input,.feedback-form select\{min-height:48px;font-size:16px\}/);
  assert.match(foundation, /feedback-form textarea\{font-size:16px;line-height:1\.45\}/);
  assert.match(foundation, /submit-button\{min-height:52px;font-size:16px\}/);
  assert.match(foundation, /social-icon\{width:48px;height:48px/);
  assert.match(foundation, /profile-tab\{min-height:44px/);
  assert.match(foundation, /lightbox button\{min-width:48px;min-height:48px\}/);
  assert.match(foundation, /@media\(max-width:320px\)\{[\s\S]*?\.logo,\.logo img\{width:min\((?:230|2[0-2]\d)px,calc\(100vw - 90px\)\)\}/);
});

test('all public navigation pages use consistent cache versions', async () => {
  for (const name of publicPages) {
    const html = await readFile(new URL(name, root), 'utf8');
    assert.match(html, /site-navigation\.js\?v=site-navigation-8/);
    assert.doesNotMatch(html, /site-navigation\.js\?v=site-navigation-[1-7]/);
    assert.match(html, /mobile-navigation\.css\?v=mobile-navigation-6/);
    assert.match(html, /mobile-foundation\.css\?v=mobile-foundation-4/);
    assert.doesNotMatch(html, /mobile-foundation\.css\?v=mobile-foundation-[1-3]/);
  }
  assert.match(owner, /mobile-navigation\.js\?v=mobile-navigation-5/);
});
