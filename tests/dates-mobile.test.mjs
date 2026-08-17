import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initialiseDatesMobileLayout } from '../public/site/js/dates-mobile-layout.js';
import { initialiseDatesMobileFilters } from '../public/site/js/dates-mobile-filters.js';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const css = await readFile(new URL('assets/dates-mobile.css', root), 'utf8');
const layout = await readFile(new URL('public/site/js/dates-mobile-layout.js', root), 'utf8');
const filters = await readFile(new URL('public/site/js/dates-mobile-filters.js', root), 'utf8');

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

function filterFixture(matches) {
  let activeElement = null;
  const controls = { dataset: {} };
  const panelChild = {};
  const panel = { hidden: false, contains: value => value === panelChild };
  const attributes = new Map([['aria-expanded', 'false']]);
  const toggle = {
    hidden: false,
    addEventListener(type, handler) { assert.equal(type, 'click'); this.handler = handler; },
    setAttribute(name, value) { attributes.set(name, value); },
    focus() { if (!this.hidden) activeElement = this; }
  };
  const documentRef = {
    get activeElement() { return activeElement; },
    getElementById: id => ({ 'dates-controls': controls, 'dates-filter-toggle': toggle, 'dates-filter-panel': panel })[id]
  };
  const media = { matches, addEventListener(type, handler) { assert.equal(type, 'change'); this.handler = handler; } };
  return { attributes, controls, documentRef, media, panel, panelChild, setActive: value => { activeElement = value; }, toggle };
}

test('Dates controls have single DOM ownership', () => {
  for (const id of ['event-search-input', 'calendar-body', 'category-filters', 'dates-controls', 'dates-filter-toggle', 'dates-filter-panel']) {
    assert.equal((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1);
  }
  assert.doesNotMatch(layout, /cloneNode|innerHTML|replaceChildren/);
});

test('mobile Dates filters default closed and toggle the existing panel', () => {
  const fixture = filterFixture(true);
  assert.equal(initialiseDatesMobileFilters({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media }), true);
  assert.equal(fixture.toggle.hidden, false);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.attributes.get('aria-expanded'), 'false');
  fixture.toggle.handler();
  assert.equal(fixture.panel.hidden, false);
  assert.equal(fixture.attributes.get('aria-expanded'), 'true');
  fixture.toggle.handler();
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.attributes.get('aria-expanded'), 'false');
});

test('closing focused mobile panel returns focus to toggle', () => {
  const fixture = filterFixture(true);
  initialiseDatesMobileFilters({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media });
  fixture.toggle.handler();
  fixture.setActive(fixture.panelChild);
  fixture.toggle.handler();
  assert.equal(fixture.documentRef.activeElement, fixture.toggle);
});

test('desktop Dates filters stay visible and mobile re-entry resets closed', () => {
  const fixture = filterFixture(false);
  initialiseDatesMobileFilters({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media });
  assert.equal(fixture.toggle.hidden, true);
  assert.equal(fixture.panel.hidden, false);
  fixture.media.matches = true;
  fixture.media.handler();
  assert.equal(fixture.toggle.hidden, false);
  assert.equal(fixture.panel.hidden, true);
  fixture.media.matches = false;
  fixture.media.handler();
  assert.equal(fixture.toggle.hidden, true);
  assert.equal(fixture.panel.hidden, false);
});

test('desktop to mobile resize restores panel focus after toggle becomes visible', () => {
  const fixture = filterFixture(false);
  initialiseDatesMobileFilters({ documentRef: fixture.documentRef, matchMediaRef: () => fixture.media });
  fixture.setActive(fixture.panelChild);
  fixture.media.matches = true;
  fixture.media.handler();
  assert.equal(fixture.toggle.hidden, false);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.attributes.get('aria-expanded'), 'false');
  assert.equal(fixture.documentRef.activeElement, fixture.toggle);
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
  assert.match(html, /dates-mobile\.css\?v=dates-mobile-7/);
  assert.match(html, /dates-mobile-filters\.js\?v=dates-mobile-filters-2/);
  assert.match(html, /dates-mobile-layout\.js\?v=dates-mobile-layout-2/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /resident-slideshow\{display:none!important\}/);
});

test('collapsed mobile Dates filters keep a compact 20px event gap', () => {
  assert.match(css, /dates-controls\{width:100%;margin:0 0 20px\}/);
});

test('filter toggle is accessible and summary uses the existing app state', () => {
  assert.match(html, /id="dates-filter-toggle"[^>]+aria-expanded="false"[^>]+aria-controls="dates-filter-panel"/);
  assert.match(html, /function updateDatesFilterSummary\(count=0\)[\s\S]*?searchQuery\.trim\(\)\?`EVENTS FILTERN · \$\{count\} TREFFER`:[\s\S]*?activeFilter\?'EVENTS FILTERN · 1 AKTIV':'EVENTS FILTERN'/);
  assert.doesNotMatch(filters, /localStorage|sessionStorage|pushState|replaceState|MutationObserver|setInterval/);
  assert.match(css, /dates-filter-toggle\{display:flex;[^}]*min-height:42px;[^}]*background:linear-gradient\(var\(--grey\),var\(--grey\)\) center\/100% 26px no-repeat;color:#000;[^}]*font-size:12px/);
  assert.match(css, /dates-filter-toggle-icon\{[^}]*font-size:10px/);
  assert.match(css, /dates-filter-panel\[hidden\]\{display:none\}/);
});

test('mobile CSS guarantees default closed before filter JavaScript runs', () => {
  const mobileCss = css.slice(css.indexOf('@media(max-width:820px)'), css.indexOf('@media(max-width:320px)'));
  assert.match(mobileCss, /dates-filter-toggle\[aria-expanded="false"\] \+ \.dates-filter-panel\{display:none\}/);
  assert.doesNotMatch(mobileCss, /dates-filter-toggle\[aria-expanded="true"\] \+ \.dates-filter-panel\{[^}]*display:none/);
});

test('search and month navigation use compact mobile contracts', () => {
  assert.match(css, /event-search input\{min-height:42px;[^}]*font-size:16px/);
  assert.match(css, /event-search button\{width:42px;height:42px;font-size:18px/);
  assert.match(css, /calendar-head\{width:100%;grid-template-columns:36px minmax\(0,1fr\) 36px/);
  assert.match(css, /calendar-head button\{height:36px;background:#4b4b4b;color:#fff/);
  assert.match(css, /calendar-head button:hover,.calendar-head button:focus\{background:#4b4b4b;color:#fff/);
  assert.match(css, /calendar-head button:focus-visible\{outline:3px solid #000;outline-offset:2px/);
  assert.match(css, /calendar-head \.month\{[^}]*min-height:36px;[^}]*font-size:12px/);
});

test('calendar and filters meet mobile layout contracts', () => {
  assert.match(css, /calendar\{width:100%;table-layout:fixed;[^}]*color:#000/);
  assert.match(css, /calendar th,.calendar td\{[^}]*height:33px;font-size:12px/);
  assert.match(css, /calendar th\{color:#000;font-size:11px;font-weight:900/);
  assert.match(css, /calendar td\{color:#707070/);
  assert.match(css, /calendar td\.event-day\{color:#000/);
  assert.match(css, /calendar td a\{[^}]*display:flex;[^}]*min-height:33px/);
  assert.match(css, /calendar \.day-orange a\{background:linear-gradient\(var\(--orange\),var\(--orange\)\) center\/22px 22px no-repeat/);
  assert.match(css, /calendar \.day-olive a\{background:linear-gradient\(var\(--olive\),var\(--olive\)\) center\/22px 22px no-repeat/);
  assert.match(css, /calendar \.day-yellow a\{background:linear-gradient\(var\(--yellow\),var\(--yellow\)\) center\/22px 22px no-repeat/);
  const categoryColumns = css.match(/category-filters\{display:grid;grid-template-columns:minmax\(0,([\d.]+)fr\) minmax\(0,([\d.]+)fr\) minmax\(0,([\d.]+)fr\);gap:4px;width:100%/);
  assert.ok(categoryColumns);
  assert.ok(Number(categoryColumns[1]) > Number(categoryColumns[3]));
  assert.match(css, /side-filter\{[^}]*width:100%;[^}]*min-height:34px;[^}]*padding:2px;font-size:10px;[^}]*white-space:nowrap/);
  assert.doesNotMatch(css, /#category-filters\{[^}]*flex-wrap/);
});

test('event list and detail preserve one modern event URL', () => {
  assert.match(html, /class="event-date"/);
  assert.match(html, /class="event-name"/);
  assert.match(html, /class="more-desktop">more\.\.\.<\/span><span class="more-mobile">More Info/);
  assert.match(html, /function eventDetailUrl\(e\)[^}]+p\.set\('event',getEventId\(e\)\)/);
  assert.match(css, /event-name\{[^}]*font-size:20px/);
  assert.match(css, /line\{font-size:14px;line-height:1\.4/);
  assert.match(css, /line strong\{font-size:17px;line-height:1\.25/);
  assert.match(css, /more\{[^}]*min-height:44px;[^}]*font-size:14px/);
  assert.match(css, /event\{[^}]*margin:0 0 22px;[^}]*padding-bottom:20px;border-bottom:1px solid #000/);
  assert.match(css, /back-link\{[^}]*min-height:44px/);
  assert.match(css, /event-description\{[^}]*font-size:16px;line-height:1\.5/);
  assert.match(css, /event-hero\{width:100%;aspect-ratio:16\/9/);
  assert.match(html, /renderEvent\(e\)[\s\S]*?<h2 class="event-title/);
  assert.match(html, /renderDetail\(e\)[\s\S]*?<h1 class="event-title event-detail-title \$\{esc\(c\)\}"/);
  assert.match(css, /event-detail-title\{margin:0\}/);
  assert.match(css, /event-detail \.event-name\{font-size:24px\}/);
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
  const additions = `${css}\n${layout}\n${filters}`;
  assert.doesNotMatch(additions, /MutationObserver|setInterval|cloneNode/);
  assert.doesNotMatch(additions, /(?:data|blob):/i);
  assert.doesNotMatch(html, /tabindex="[1-9]/);
});
