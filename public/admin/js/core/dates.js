// Admin V2 date helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize today(), date parsing, date formatting and sorting keys.

function pad2(value) {
  return String(value).padStart(2, '0');
}

export function todayIso() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function isGermanDate(value) {
  return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(String(value || '').trim());
}

export function germanToIsoDate(value) {
  const raw = String(value || '').trim();
  if (!isGermanDate(raw)) return raw;
  const [day, month, year] = raw.split('.').map(part => part.trim());
  return year + '-' + pad2(month) + '-' + pad2(day);
}

export function isoToGermanDate(value) {
  const raw = String(value || '').trim();
  if (!isIsoDate(raw)) return raw;
  const [year, month, day] = raw.split('-');
  return day + '.' + month + '.' + year;
}

export function normalizeDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isIsoDate(raw)) return raw;
  if (isGermanDate(raw)) return germanToIsoDate(raw);
  return raw;
}

export function dateSortKey(value) {
  const normalized = normalizeDateInput(value);
  if (isIsoDate(normalized)) return normalized;
  return String(normalized || '9999-99-99');
}

export function compareDatesAsc(a, b) {
  return dateSortKey(a).localeCompare(dateSortKey(b));
}

export function compareDatesDesc(a, b) {
  return dateSortKey(b).localeCompare(dateSortKey(a));
}

export function parseDateParts(value) {
  const normalized = normalizeDateInput(value);
  if (!isIsoDate(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  return { year, month, day };
}

export function monthKey(value) {
  const parts = parseDateParts(value);
  if (!parts) return '';
  return parts.year + '-' + pad2(parts.month);
}

export function monthLabel(value, locale = 'de-DE') {
  const parts = parseDateParts(value);
  if (!parts) return '';
  const date = new Date(parts.year, parts.month - 1, 1);
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function isPastDate(value, reference = todayIso()) {
  const date = dateSortKey(value);
  const ref = dateSortKey(reference);
  if (!isIsoDate(date) || !isIsoDate(ref)) return false;
  return date < ref;
}

export function isFutureDate(value, reference = todayIso()) {
  const date = dateSortKey(value);
  const ref = dateSortKey(reference);
  if (!isIsoDate(date) || !isIsoDate(ref)) return false;
  return date > ref;
}
