import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialiseDatesMobileLayout } from '../public/site/js/dates-mobile-layout.js';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('assets/dates-mobile.css', root), 'utf8');
const layout = await readFile(new URL('public/site/js/dates-mobile-layout.js', root), 'utf8');

function layoutFixture(matches, search = '') {
  let parent = 'sidebar';
  const controls = { dataset: {} }, slideshow = {};
  const events = { before(value) { assert.equal(value, controls); parent = 'main'; } };
  const sidebar = { insertBefore(value, anchor) { assert.equal(value, controls); assert.equal(anchor, slideshow); parent = 'sidebar'; } };
  const classes = new Set();
  const classList = { add: value => classes.add(value), toggle: (value, force) => force ? classes.add(value) : classes.delete(value) };
  const documentRef = { getElementById: id => ({ 'dates-controls': controls, events, 'resident-slideshow': slideshow })[id], querySelector: selector => selector === '.sidebar' ? sidebar : null, documentElement: { classList } };
  const media = { matches, addEventListener(type, handler) { assert.equal(type, 'change'); this.handler = handler; } };
  return { classes, controls, documentRef, getParent: () => parent, media, search };
}

test('Dates controls have single DOM ownership', () => {
  for (const id of ['event-search-input', 'calendar-body', 'category-filters', 'dates-controls']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
  }
  assert.doesNotMatch(layout, /cloneNode|innerHTML|replaceChildren/);
});

test('mobile placement moves and restores the same controls element', () => {
  const fixture = layoutFixture(true);
  assert.equal(initialiseDatesMobileLayout({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media, locationRef: { search: '' } }), true);
  assert.equal(fixture.getParent(), 'main');
  fixture.media.matches = false;
  fixture.media.handler();
  assert.equal(fixture.getParent(), 'sidebar');
  assert.ok(fixture.classes.has('dates-mobile-layout-ready'));
  assert.ok(!fixture.classes.has('dates-event-detail-mode'));
});

test('mobile event detail keeps controls in the hidden Sidebar owner', () => {
  const fixture = layoutFixture(true, '?event=example');
  initialiseDatesMobileLayout({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media, locationRef: { search: fixture.search } });
  assert.equal(fixture.getParent(), 'sidebar');
  assert.ok(fixture.classes.has('dates-event-detail-mode'));
  assert.match(css, /dates-event-detail-mode \.dates-title\{display:none\}/);
});

test('desktop event detail keeps controls in the Sidebar', () => {
  const fixture = layoutFixture(false, '?event=example');
  initialiseDatesMobileLayout({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media, locationRef: { search: fixture.search } });
  assert.equal(fixture.getParent(), 'sidebar');
  assert.ok(fixture.classes.has('dates-event-detail-mode'));
});

test('Dates mobile stylesheet and cache references are scoped', () => {
  assert.match(html, /dates-mobile\.css\?v=dates-mobile-2/);
  assert.match(html, /dates-mobile-layout\.js\?v=dates-mobile-layout-2/);
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
  assert.match(html, /renderEvent\(e\)[\s\S]*?<h2 class="event-title/);
  assert.match(html, /renderDetail\(e\)[\s\S]*?<h1 class="event-title event-detail-title \$\{esc\(c\)\}"/);
  assert.match(css, /event-detail-title\{margin:0\}/);
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
