export const EVENT_STORAGE_SCHEMA_VERSION = 1;
export const EVENT_DATA_ROOT = 'public/events/data';

export function effectiveEventId(event) {
  if (event?.id) return event.id;
  return String(`${event?.date || ''} ${event?.title || 'event'}` || 'event')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
}

export function eventMonthKey(date) {
  const value = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) return '';
  return value.slice(0, 7);
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
    const month = eventMonthKey(event.date);
    if (!month) throw new Error(`Event ohne gültigen Monat: ${effectiveEventId(event)}`);
    const id = effectiveEventId(event);
    if (idMap.has(id)) throw new Error(`Kollision der wirksamen Event-ID: ${id}`);
    idMap.set(id, event);
    if (!monthMap.has(month)) monthMap.set(month, []);
    monthMap.get(month).push(event);
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

export function reconstructEventDocument(storage) {
  const byId = new Map();
  for (const month of storage.months.values()) {
    for (const event of month.events || []) byId.set(effectiveEventId(event), event);
  }
  const orderedEvents = [...storage.eventIndex.events].sort((a, b) => a.order - b.order).map(entry => {
    const event = byId.get(entry.id);
    if (!event) throw new Error(`Event fehlt bei Rekonstruktion: ${entry.id}`);
    return event;
  });
  if (orderedEvents.length !== storage.manifest.totalEvents) throw new Error('Eventanzahl stimmt bei Rekonstruktion nicht.');
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
