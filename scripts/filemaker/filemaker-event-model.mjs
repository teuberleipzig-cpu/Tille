import { effectiveEventId, eventMonthKey } from '../../public/site/js/event-storage-model.js';

export const FILEMAKER_ID_PATTERN = /^fm-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_PAYLOAD_BYTES = 40 * 1024;
const FIELD_LIMITS = { title: 180, color: 40, moreUrl: 2000, imageUrl: 2000, description: 10000, status: 80 };
const ITEM_LIMITS = { name: 300, info: 1000, link: 2000 };
const SECTION_LIMITS = { label: 300, genre: 300 };
const SUPPORTED_FIELDS = new Set(['id', 'date', ...Object.keys(FIELD_LIMITS), 'sections']);
const FORBIDDEN_TEXT = /<(?:script|iframe|form)\b|(?:javascript|data|blob):|;base64,/i;
const SECRET_PATTERN = /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/;
const CONTROL_GARBAGE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} muss ein Objekt sein.`);
  return value;
}

function text(value, label, max, { required = false } = {}) {
  if (typeof value !== 'string') throw new Error(`${label} muss Text sein.`);
  if (CONTROL_GARBAGE.test(value)) throw new Error(`${label} enthält ungültige Steuerzeichen.`);
  if (FORBIDDEN_TEXT.test(value)) throw new Error(`${label} enthält verbotenen aktiven oder kodierten Inhalt.`);
  if (SECRET_PATTERN.test(value)) throw new Error(`${label} enthält ein mögliches Secret.`);
  if (value.length > max) throw new Error(`${label} ist zu lang.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} darf nicht leer sein.`);
  return normalized;
}

function safeUrl(value, label, { hash = false, localImage = false } = {}) {
  const normalized = text(value, label, 2000);
  if (!normalized || (hash && normalized === '#')) return normalized;
  if (localImage && normalized.startsWith('public/events/media/')) {
    if (normalized.includes('..') || normalized.includes('\\') || !/^public\/events\/media\/[A-Za-z0-9._/-]+$/.test(normalized)) throw new Error(`${label} enthält einen unsicheren Medienpfad.`);
    return normalized;
  }
  let url;
  try { url = new URL(normalized); } catch (_) { throw new Error(`${label} muss leer oder eine HTTP/HTTPS-URL sein.`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} muss HTTP oder HTTPS verwenden.`);
  if (url.username || url.password) throw new Error(`${label} darf keine Zugangsdaten enthalten.`);
  return normalized;
}

export function normalizeFileMakerId(value) {
  const id = String(value || '').trim().toLowerCase();
  if (!id) throw new Error('FileMaker Event-ID fehlt.');
  if (!FILEMAKER_ID_PATTERN.test(id)) throw new Error('FileMaker Event-ID muss dem Contract fm-<uuid> entsprechen.');
  return id;
}

function normalizeItem(value, index) {
  const item = object(value, `sections[].items[${index}]`);
  for (const key of Object.keys(item)) if (!(key in ITEM_LIMITS)) throw new Error(`Nicht unterstütztes Artist-Feld: ${key}`);
  return {
    name: text(item.name ?? '', 'Artist name', ITEM_LIMITS.name),
    info: text(item.info ?? '', 'Artist info', ITEM_LIMITS.info),
    link: safeUrl(item.link ?? '', 'Artist link')
  };
}

function normalizeSections(value) {
  if (!Array.isArray(value)) throw new Error('sections muss ein Array sein.');
  if (value.length > 20) throw new Error('sections enthält zu viele Einträge.');
  return value.map((entry, sectionIndex) => {
    const section = object(entry, `sections[${sectionIndex}]`);
    for (const key of Object.keys(section)) if (!['label', 'genre', 'items'].includes(key)) throw new Error(`Nicht unterstütztes Section-Feld: ${key}`);
    if (section.items != null && !Array.isArray(section.items)) throw new Error('section.items muss ein Array sein.');
    if ((section.items || []).length > 100) throw new Error('section.items enthält zu viele Einträge.');
    return {
      label: text(section.label ?? '', 'Section label', SECTION_LIMITS.label),
      genre: text(section.genre ?? '', 'Section genre', SECTION_LIMITS.genre),
      items: (section.items || []).map(normalizeItem)
    };
  });
}

export function parseFileMakerEventJson(raw, operation = 'upsert') {
  const source = String(raw ?? '');
  if (Buffer.byteLength(source, 'utf8') > MAX_PAYLOAD_BYTES) throw new Error('FileMaker Event-Payload überschreitet 40 KB.');
  let parsed;
  try { parsed = JSON.parse(source); } catch (error) { throw new Error(`FileMaker Event-JSON ist ungültig: ${error.message}`); }
  const input = object(parsed, 'FileMaker Event-Payload');
  if (!['upsert', 'remove'].includes(operation)) throw new Error(`Nicht unterstützte Operation: ${operation}`);
  for (const key of Object.keys(input)) if (!SUPPORTED_FIELDS.has(key)) throw new Error(`Nicht unterstütztes Event-Feld: ${key}`);
  const output = { id: normalizeFileMakerId(input.id) };
  if (operation === 'remove') return output;
  if ('date' in input) {
    output.date = text(input.date, 'Event-Datum', 10, { required: true });
    if (!eventMonthKey(output.date)) throw new Error('Event-Datum muss ein real existierendes Datum im Format YYYY-MM-DD sein.');
  }
  if ('title' in input) output.title = text(input.title, 'Event-Titel', FIELD_LIMITS.title, { required: true });
  for (const field of ['color', 'description', 'status']) if (field in input) output[field] = text(input[field], `Event ${field}`, FIELD_LIMITS[field]);
  if ('moreUrl' in input) output.moreUrl = safeUrl(input.moreUrl, 'Event moreUrl', { hash: true });
  if ('imageUrl' in input) output.imageUrl = safeUrl(input.imageUrl, 'Event imageUrl', { localImage: true });
  if ('sections' in input) output.sections = normalizeSections(input.sections);
  return output;
}

function insertionIndex(events, date) {
  let sameDateEnd = -1;
  for (let index = 0; index < events.length; index++) {
    if (events[index].date === date) sameDateEnd = index + 1;
    else if (sameDateEnd < 0 && String(events[index].date) > date) return index;
  }
  return sameDateEnd >= 0 ? sameDateEnd : events.length;
}

export function applyFileMakerOperation(document, operation, input) {
  if (!document || !Array.isArray(document.events)) throw new Error('Event-Dokument ist ungültig.');
  const events = document.events.map(event => structuredClone(event));
  const index = events.findIndex(event => effectiveEventId(event) === input.id);
  const existing = index >= 0 ? events[index] : null;
  if (existing && !FILEMAKER_ID_PATTERN.test(effectiveEventId(existing))) throw new Error('Nicht-FileMaker-Events dürfen nicht verändert werden.');
  const beforeMonth = existing ? eventMonthKey(existing.date) : '';
  if (operation === 'remove') {
    if (index >= 0) events.splice(index, 1);
    return { document: { ...structuredClone(document), events }, action: existing ? 'removed' : 'no-op', exists: !!existing, beforeMonth, afterMonth: '' };
  }
  if (!existing && (!input.date || !input.title)) throw new Error('Neue FileMaker-Events benötigen date und title.');
  const event = existing ? { ...existing, ...input, id: input.id } : {
    id: input.id, date: input.date, title: input.title, color: 'orange', moreUrl: '', imageUrl: '', description: '', sections: [], ...input
  };
  const afterMonth = eventMonthKey(event.date);
  if (!afterMonth) throw new Error('Event-Datum muss gültig sein.');
  if (!String(event.title || '').trim()) throw new Error('Event-Titel darf nicht leer sein.');
  if (existing && event.date === existing.date) events[index] = event;
  else {
    if (existing) events.splice(index, 1);
    events.splice(insertionIndex(events, event.date), 0, event);
  }
  const ids = events.map(effectiveEventId);
  if (new Set(ids).size !== ids.length) throw new Error('Kollision der wirksamen Event-ID.');
  return { document: { ...structuredClone(document), events }, action: existing ? 'updated' : 'created', exists: !!existing, beforeMonth, afterMonth };
}
