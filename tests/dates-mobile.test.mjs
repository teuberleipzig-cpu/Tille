import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialiseDatesMobileLayout } from '../public/site/js/dates-mobile-layout.js';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('assets/dates-mobile.css', root), 'utf8');
const layout = await readFile(new URL('public/site/js/dates-mobile-layout.js', root), 'utf8');

test('Dates controls have single DOM ownership', () => {
  for (const id of ['event-search-input', 'calendar-body', 'category-filters', 'dates-controls']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
  }
  assert.doesNotMatch(layout, /cloneNode|innerHTML|replaceChildren/);
});

test('mobile placement moves and restores the same controls element', () => {
  let parent = 'sidebar';
  const controls = { dataset: {} };
  const slideshow = {};
  const events = { before(value) { assert.equal(value, controls); parent = 'main'; } };
  const sidebar = { insertBefore(value, anchor) { assert.equal(value, controls); assert.equal(anchor, slideshow); parent = 'sidebar'; } };
  const classes = new Set();
  const documentRef = { getElementById: id => ({ 'dates-controls': controls, events, 'resident-slideshow': slideshow })[id], querySelector: selector => selector === '.sidebar' ? sidebar : null, documentElement: { classList: { add: value => classes.add(value) } } };
  const media = { matches: true, addEventListener(type, handler) { assert.equal(type, 'change'); this.handler = handler; } };
  assert.equal(initialiseDatesMobileLayout({ documentRef, matchMediaRef: () => media }), true);
  assert.equal(parent, 'main');
  media.matches = false;
  media.handler();
  assert.equal(parent, 'sidebar');
  assert.ok(classes.has('dates-mobile-layout-ready'));
});

test('Dates mobile stylesheet and cache references are scoped', () => {
  assert.match(html, /dates-mobile\.css\?v=dates-mobile-1/);
  assert.match(html, /dates-mobile-layout\.js\?v=dates-mobile-layout-1/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /resident-slideshow\{display:none!important\}/);
});

test('search and month navigation meet mobile touch contracts', () => {
  assert.match(css, /event-search input\{min-height:48px;[^}]*font-size:16px/);
  assert.match(css, /event-search button\{width:48px;height:48px/);
  assert.match(css, /calendar-head\{width:100%;grid-template-columns:48px minmax\(0,1fr\) 48px/);
  assert.match(css, /calendar-head button\{height:48px/);
  assert.match(css, /calendar-head \.month\{[^}]*min-height:48px/);
});

test('calendar and filters meet mobile layout contracts', () => {
  assert.match(css, /calendar\{width:100%;table-layout:fixed/);
  assert.match(css, /calendar td a\{[^}]*display:flex;[^}]*min-height:44px/);
  assert.match(css, /category-filters\{display:flex;flex-wrap:wrap/);
  assert.match(css, /side-filter\{[^}]*min-height:46px/);
});

test('event list and detail preserve one modern event URL', () => {
  assert.match(html, /class="event-date"/);
  assert.match(html, /class="event-name"/);
  assert.match(html, /class="more-desktop">more\.\.\.<\/span><span class="more-mobile">More Info/);
  assert.match(html, /function eventDetailUrl\(e\)[^}]+p\.set\('event',getEventId\(e\)\)/);
  assert.match(css, /more\{[^}]*min-height:46px/);
  assert.match(css, /back-link\{[^}]*min-height:44px/);
  assert.match(css, /event-description\{[^}]*font-size:16px;line-height:1\.5/);
  assert.match(css, /event-hero\{width:100%;aspect-ratio:16\/9/);
});

test('month picker is mobile-safe and traps focus', () => {
  assert.match(css, /month-picker\{width:min\(320px,calc\(100vw - 32px\)\)/);
  assert.match(css, /month-picker select,.month-picker input\{min-height:48px;[^}]*font-size:16px/);
  assert.match(css, /month-picker button\{min-height:46px/);
  assert.match(html, /if\(e\.key==='Escape'\)/);
  assert.match(html, /if\(e\.key!=='Tab'\)return/);
  assert.match(html, /e\.shiftKey&&document\.activeElement===first/);
  assert.match(html, /opener\.focus\(\)/);
});

test('Dates V3B introduces no unsafe primitives', () => {
  const additions = `${css}\n${layout}`;
  assert.doesNotMatch(additions, /MutationObserver|setInterval|cloneNode/);
  assert.doesNotMatch(additions, /(?:data|blob):/i);
  assert.doesNotMatch(html, /tabindex="[1-9]/);
});
