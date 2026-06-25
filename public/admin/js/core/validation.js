// Admin V2 validation helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize small validation checks before forms are migrated.

export function required(value, label = 'Feld') {
  const text = String(value ?? '').trim();
  if (!text) return label + ' fehlt.';
  return '';
}

export function isEmail(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
}

export function email(value, label = 'E-Mail') {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!isEmail(text)) return label + ' ist ungültig.';
  return '';
}

export function isUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

export function url(value, label = 'URL') {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!isUrl(text)) return label + ' ist ungültig.';
  return '';
}

export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function isoDate(value, label = 'Datum') {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (!isIsoDate(text)) return label + ' muss im Format yyyy-mm-dd sein.';
  return '';
}

export function minLength(value, min, label = 'Feld') {
  const text = String(value ?? '').trim();
  const limit = Number(min) || 0;
  if (text && text.length < limit) return label + ' ist zu kurz.';
  return '';
}

export function maxLength(value, max, label = 'Feld') {
  const text = String(value ?? '').trim();
  const limit = Number(max) || 0;
  if (limit && text.length > limit) return label + ' ist zu lang.';
  return '';
}

export function arrayNotEmpty(value, label = 'Liste') {
  if (!Array.isArray(value) || value.length === 0) return label + ' ist leer.';
  return '';
}

export function collectErrors(...checks) {
  return checks.flat().filter(Boolean);
}

export function hasErrors(errors) {
  return Array.isArray(errors) && errors.length > 0;
}

export function assertNoErrors(errors, label = 'Validierung') {
  if (hasErrors(errors)) {
    const error = new Error(label + ' fehlgeschlagen: ' + errors.join(' '));
    error.errors = errors;
    throw error;
  }
}

export function validateObject(schema, value) {
  const data = value || {};
  const errors = [];
  for (const [key, validators] of Object.entries(schema || {})) {
    const list = Array.isArray(validators) ? validators : [validators];
    for (const validator of list) {
      if (typeof validator !== 'function') continue;
      const message = validator(data[key], data);
      if (message) errors.push(message);
    }
  }
  return errors;
}
