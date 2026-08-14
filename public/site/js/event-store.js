import { effectiveEventId, searchEventIndex } from './event-storage-model.js?v=event-storage-model-1';

const MANIFEST_URL = 'public/events/data/manifest.json';

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${path} konnte nicht geladen werden (${response.status})`);
  return response.json();
}

export function createPublicEventStore() {
  let manifestPromise;
  let eventIndexPromise;
  let searchIndexPromise;
  const monthPromises = new Map();

  const manifest = () => manifestPromise ||= fetchJson(MANIFEST_URL);

  async function monthEntry(key) {
    const data = await manifest();
    return data.months.find(month => month.key === key) || null;
  }

  async function loadMonth(key) {
    if (monthPromises.has(key)) return monthPromises.get(key);
    const promise = monthEntry(key).then(entry => entry ? fetchJson(entry.path).then(data => data.events || []) : []);
    monthPromises.set(key, promise);
    return promise;
  }

  async function loadEventIndex() {
    if (!eventIndexPromise) eventIndexPromise = manifest().then(data => fetchJson(data.eventIndexPath));
    return eventIndexPromise;
  }

  async function loadSearchIndex() {
    if (!searchIndexPromise) searchIndexPromise = manifest().then(data => fetchJson(data.searchIndexPath));
    return searchIndexPromise;
  }

  async function resolveEvent(id) {
    const index = await loadEventIndex();
    const entry = index.events.find(item => item.id === id);
    if (!entry) return null;
    const events = await loadMonth(entry.month);
    const event = events.find(item => effectiveEventId(item) === id) || null;
    return event?.status === 'archived' ? null : event;
  }

  async function search(query) {
    const index = await loadSearchIndex();
    const matches = searchEventIndex(index.events.filter(entry => entry.status !== 'archived'), query);
    const monthKeys = [...new Set(matches.map(entry => entry.month))];
    const monthData = await Promise.all(monthKeys.map(loadMonth));
    const byId = new Map(monthData.flat().map(event => [effectiveEventId(event), event]));
    return matches.map(entry => byId.get(entry.id)).filter(Boolean);
  }

  return { manifest, loadMonth, resolveEvent, search };
}
