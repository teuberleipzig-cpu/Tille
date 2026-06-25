// Admin V2 text helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize escaping, normalization, slug creation and small string helpers.

export function toText(value) {
  return String(value ?? '');
}

export function trimText(value) {
  return toText(value).trim();
}

export function escapeHtml(value) {
  return toText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeText(value) {
  return trimText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss');
}

export function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function compactWhitespace(value) {
  return trimText(value).replace(/\s+/g, ' ');
}

export function lines(value) {
  return toText(value)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function joinLines(values) {
  return Array.isArray(values) ? values.map(trimText).filter(Boolean).join('\n') : '';
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === '') return [];
  return [value];
}

export function uniqueTexts(values) {
  const seen = new Set();
  const out = [];
  for (const value of asArray(values)) {
    const text = trimText(value);
    const key = normalizeText(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function truncateText(value, maxLength = 120) {
  const text = trimText(value);
  const limit = Number(maxLength) || 120;
  if (text.length <= limit) return text;
  return text.slice(0, Math.max(0, limit - 1)).trimEnd() + '…';
}
