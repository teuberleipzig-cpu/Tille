import { acceptanceClient, acceptanceFailure, acceptanceFailureMessage,
  internalAcceptancePath, parseAcceptanceJson } from './staging-acceptance-http.mjs';

const NAV = '/public/site/data/site-navigation.json';
const MANIFEST = '/public/events/data/manifest.json';
const RESIDENTS = '/public/residents/data/residents.json';
const PAGES = ['/', '/index.html', '/about.html', '/contact.html', '/history.html',
  '/news.html', '/residents.html', '/feedback.html', '/gallery.html'];
const APPS = [
  { path: '/public/admin/', markers: ['adminEnvironment', 'eventList'],
    script: '/public/admin/js/admin-app.js', css: '/public/admin/css/admin.css' },
  { path: '/public/resident-portal/', markers: ['loginScreen', 'portalStatus'],
    script: '/public/resident-portal/js/app-coverfix.js', css: '/public/resident-portal/css/portal.css' }
];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;

function requireStructure(condition, endpoint, reason) {
  if (!condition) throw acceptanceFailure(endpoint, reason);
}

function uniqueIds(items, endpoint) {
  const ids = new Set();
  for (const item of items) {
    requireStructure(object(item) && typeof item.id === 'string' && item.id.trim().length > 0,
      endpoint, 'missing or invalid ID');
    requireStructure(!ids.has(item.id), endpoint, 'duplicate ID');
    ids.add(item.id);
  }
  return ids;
}

async function navigation(read) {
  const nav = await read(NAV, { json: true });
  requireStructure(object(nav) && nav.schemaVersion === 1 && Array.isArray(nav.pages) && nav.pages.length > 0,
    NAV, 'invalid navigation schema');
  const ids = uniqueIds(nav.pages, NAV);
  requireStructure(ids.has(nav.homePage), NAV, 'homePage is not registered');
  const reachable = new Set();
  for (const page of nav.pages) {
    requireStructure(integer(page.order) && typeof page.enabled === 'boolean' && typeof page.available === 'boolean',
      NAV, 'invalid order or visibility flags');
    if (!page.enabled || !page.available) continue;
    requireStructure(typeof page.href === 'string' && page.href.length > 0, NAV, 'missing href');
    if (/^https?:\/\//i.test(page.href)) {
      let url;
      try { url = new URL(page.href); } catch { throw acceptanceFailure(NAV, 'invalid href'); }
      if (url.origin !== 'https://www-test.distillery.de') continue;
      reachable.add(internalAcceptancePath(page.href.replace(/^https?:\/\/[^/]+/i, '') || '/', NAV));
    } else reachable.add(internalAcceptancePath(page.href, NAV));
  }
  // A dynamic URL is attributed to its source; never echo arbitrary JSON values.
  for (const path of reachable) await read(path, { label: NAV });
}

function manifestMonths(manifest) {
  requireStructure(object(manifest) && manifest.schemaVersion === 1 && integer(manifest.totalEvents)
    && Array.isArray(manifest.months), MANIFEST, 'invalid manifest schema');
  const keys = new Set();
  let total = 0;
  for (const month of manifest.months) {
    requireStructure(object(month) && typeof month.key === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month.key),
      MANIFEST, 'invalid month key');
    requireStructure(!keys.has(month.key), MANIFEST, 'duplicate month key');
    keys.add(month.key);
    requireStructure(month.path === `public/events/data/months/${month.key}.json`, MANIFEST, 'unsafe manifest path');
    requireStructure(integer(month.count), MANIFEST, 'invalid month count');
    total += month.count;
  }
  requireStructure(total === manifest.totalEvents, MANIFEST, 'totalEvents count mismatch');
  return [...manifest.months].sort((a, b) => a.key.localeCompare(b.key));
}

async function events(read, manifestText) {
  const manifest = manifestText === undefined ? await read(MANIFEST, { json: true }) : parseAcceptanceJson(manifestText, MANIFEST);
  const months = manifestMonths(manifest);
  if (!months.length) return;
  const samples = [...new Set([0, Math.floor(months.length / 2), months.length - 1])];
  let eventId;
  for (const index of [...new Set(samples)]) {
    const month = months[index], endpoint = '/' + month.path;
    const data = await read(endpoint, { json: true });
    requireStructure(object(data) && Array.isArray(data.events), endpoint, 'events must be an array');
    requireStructure(data.events.length === month.count, endpoint, 'manifest count mismatch');
    uniqueIds(data.events, endpoint);
    if (eventId === undefined && data.events.length) eventId = data.events[0].id;
  }
  // Preserve the three-month cap even if all sampled months are empty.
  if (eventId === undefined && manifest.totalEvents > 0) {
    const endpoint = '/public/events/data/event-index.json';
    const index = await read(endpoint, { json: true });
    requireStructure(object(index) && Array.isArray(index.events), endpoint, 'invalid event index');
    const entry = index.events.find(e => object(e) && months.some(m => m.key === e.month && m.count > 0));
    requireStructure(entry && typeof entry.id === 'string', endpoint, 'missing event ID');
    eventId = entry.id;
  }
  if (eventId !== undefined) {
    requireStructure(/^[a-zA-Z0-9_-]+$/.test(eventId), MANIFEST, 'unsafe static event ID');
    await read(`/events/${eventId}/`, { label: MANIFEST });
  }
}

async function applications(read) {
  for (const app of APPS) {
    const html = await read(app.path);
    for (const marker of app.markers) {
      requireStructure(new RegExp(`\\bid=["']${marker}["']`).test(html), app.path, 'missing app marker');
    }
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)];
    const entry = scripts.find(match => {
      try { return new URL(match[1], `https://www-test.distillery.de${app.path}`).pathname === app.script; }
      catch { return false; }
    });
    requireStructure(Boolean(entry), app.path, 'missing main script');
    const src = new URL(entry[1], `https://www-test.distillery.de${app.path}`);
    requireStructure(src.origin === 'https://www-test.distillery.de', app.path, 'foreign main script');
    await read(src.pathname + src.search, { label: app.script });
    await read(app.css);
  }
}

// One attempt only: the caller owns the existing shared six-attempt retry budget.
export async function verifyStagingAcceptance({ fetchImpl = fetch, query, manifestText } = {}) {
  try {
    const read = acceptanceClient(fetchImpl, query);
    for (const page of PAGES) await read(page);
    await navigation(read);
    await events(read, manifestText);
    const residents = await read(RESIDENTS, { json: true });
    requireStructure(object(residents) && Array.isArray(residents.residents), RESIDENTS, 'residents must be an array');
    uniqueIds(residents.residents, RESIDENTS);
    await applications(read);
    return { valid: true };
  } catch (error) {
    if (acceptanceFailureMessage(error)) throw error;
    throw acceptanceFailure('/', 'structural verification failed');
  }
}
