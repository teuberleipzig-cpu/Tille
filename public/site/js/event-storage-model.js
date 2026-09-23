import { calendarDayNumber, assertConsecutiveDays } from './event-date-rules.js?v=event-date-rules-1';

export const EVENT_STORAGE_SCHEMA_VERSION = 1;
export const EVENT_DATA_ROOT = 'public/events/data';

export function effectiveEventId(event) {
  if (event?.id) return event.id;
  return String(`${event?.date || ''} ${event?.title || 'event'}` || 'event')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
}

export function eventMonthKey(date) {
  return Number.isFinite(calendarDayNumber(date)) ? date.slice(0, 7) : '';
}

// Persisted data is already normalized. Never repair an inconsistent stored list.
export function eventDates(event) {
  const dates = Object.hasOwn(event, 'dates') ? event.dates : [event.date];
  if (!Array.isArray(dates) || !dates.length || dates.length > 31) throw new Error('Ungültige Event-dates: 1 bis 31 Tage erforderlich.');
  for (let i = 0; i < dates.length; i++) {
    if (!eventMonthKey(dates[i]) || (i > 0 && dates[i - 1] >= dates[i])) {
      throw new Error('Ungültige Event-dates: reale, eindeutige, chronologische Tage erforderlich.');
    }
  }
  if (event.date !== dates[0]) throw new Error('Event-date muss dem ersten dates-Wert entsprechen.');
  assertConsecutiveDays(dates);
  return [...dates];
}

export function eventMonthKeys(event) {
  return [...new Set(eventDates(event).map(eventMonthKey))];
}

export function normalizeEventSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('de');
}

export function eventSearchHaystack(event) {
  return normalizeEventSearchText([
    event.title,
    event.description,
    event.moreUrl,
    ...(event.sections || []).flatMap(section => [
      section.label,
      ...(section.items || []).flatMap(item => [item.name, item.info, item.link])
    ])
  ].join(' '));
}

export function searchEventIndex(entries, query) {
  const terms = normalizeEventSearchText(query).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries.filter(entry => terms.every(term => entry.haystack.includes(term)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title), 'de'));
}

function assertDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Event-Dokument muss ein Objekt sein.');
  if (!Array.isArray(document.events)) throw new Error('Event-Dokument events[] fehlt.');
}

export function buildEventStorage(document) {
  assertDocument(document);
  const monthMap = new Map();
  const idMap = new Map();
  const eventIndex = [];
  const searchIndex = [];

  document.events.forEach((event, order) => {
    const monthKeys = eventMonthKeys(event), month = monthKeys[0];
    const id = effectiveEventId(event);
    if (idMap.has(id)) throw new Error(`Kollision der wirksamen Event-ID: ${id}`);
    idMap.set(id, event);
    for (const key of monthKeys) {
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key).push(event);
    }
    eventIndex.push({ id, month, order });
    searchIndex.push({ id, month, date: event.date, title: event.title, status: event.status, haystack: eventSearchHaystack(event) });
  });

  const months = [...monthMap].sort(([a], [b]) => a.localeCompare(b)).map(([key, events]) => ({
    key,
    path: `${EVENT_DATA_ROOT}/months/${key}.json`,
    count: events.length
  }));
  const metadata = Object.fromEntries(Object.entries(document).filter(([key]) => key !== 'events'));
  const manifest = {
    schemaVersion: EVENT_STORAGE_SCHEMA_VERSION,
    totalEvents: document.events.length,
    totalMonthPlacements: months.reduce((total, month) => total + month.count, 0),
    topLevelKeys: Object.keys(document),
    metaPath: `${EVENT_DATA_ROOT}/meta.json`,
    eventIndexPath: `${EVENT_DATA_ROOT}/event-index.json`,
    searchIndexPath: `${EVENT_DATA_ROOT}/search-index.json`,
    months
  };
  return {
    manifest,
    metadata,
    months: new Map([...monthMap].map(([key, events]) => [key, { schemaVersion: EVENT_STORAGE_SCHEMA_VERSION, events }])),
    eventIndex: { schemaVersion: EVENT_STORAGE_SCHEMA_VERSION, events: eventIndex },
    searchIndex: { schemaVersion: EVENT_STORAGE_SCHEMA_VERSION, events: searchIndex }
  };
}

function sameContent(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameContent(a[key], b[key]));
}

function collectStoredEvents(storage) {
  const byId = new Map();
  const placements = new Map();
  for (const [key, month] of storage.months) {
    if (!Array.isArray(month.events)) throw new Error('Monats-events fehlen.');
    const ids = new Set();
    for (const event of month.events) {
      const id = effectiveEventId(event);
      if (ids.has(id) || !eventMonthKeys(event).includes(key)) throw new Error('Ungültige Event-Monatszuordnung.');
      ids.add(id);
      if (byId.has(id) && !sameContent(byId.get(id), event)) throw new Error(`Widersprüchliche Event-Kopien: ${id}`);
      if (!byId.has(id)) byId.set(id, event);
      if (!placements.has(id)) placements.set(id, new Set());
      placements.get(id).add(key);
    }
  }
  for (const [id, event] of byId) {
    if (placements.get(id).size !== eventMonthKeys(event).length) throw new Error(`Event-Monatskopie fehlt: ${id}`);
  }
  return byId;
}

export function reconstructEventDocument(storage) {
  const byId = collectStoredEvents(storage), ids = new Set();
  const orderedEvents = [...storage.eventIndex.events].sort((a, b) => a.order - b.order).map((entry, order) => {
    if (ids.has(entry.id)) throw new Error('Doppelte Event-ID im Eventindex.');
    ids.add(entry.id);
    if (entry.order !== order) throw new Error('Ungültige globale Event-Reihenfolge.');
    const event = byId.get(entry.id);
    if (!event) throw new Error(`Event fehlt bei Rekonstruktion: ${entry.id}`);
    if (entry.month !== eventMonthKey(event.date)) throw new Error('Eventindex hat falschen Primärmonat.');
    return event;
  });
  if (orderedEvents.length !== byId.size || byId.size !== storage.manifest.totalEvents) throw new Error('Eventanzahl stimmt bei Rekonstruktion nicht.');
  const values = { ...storage.metadata, events: orderedEvents };
  return Object.fromEntries(storage.manifest.topLevelKeys.map(key => [key, values[key]]));
}

export function storageArtifacts(document) {
  const storage = buildEventStorage(document);
  const text = value => JSON.stringify(value, null, 2) + '\n';
  const files = new Map([
    [`${EVENT_DATA_ROOT}/manifest.json`, text(storage.manifest)],
    [storage.manifest.metaPath, text(storage.metadata)],
    [storage.manifest.eventIndexPath, text(storage.eventIndex)],
    [storage.manifest.searchIndexPath, text(storage.searchIndex)]
  ]);
  for (const month of storage.manifest.months) files.set(month.path, text(storage.months.get(month.key)));
  return { storage, files };
}
