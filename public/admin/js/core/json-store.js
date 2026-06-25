// Admin V2 JSON helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize safe JSON parsing, formatting and cloning before data modules are migrated.

export function parseJson(text, fallback = null) {
  const raw = String(text ?? '').trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    const e = new Error('JSON konnte nicht gelesen werden: ' + error.message);
    e.cause = error;
    e.raw = raw;
    throw e;
  }
}

export function parseJsonSafe(text, fallback = null) {
  try {
    return parseJson(text, fallback);
  } catch (_) {
    return fallback;
  }
}

export function formatJson(value, spaces = 2) {
  return JSON.stringify(value ?? null, null, spaces);
}

export function cloneJson(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function readJsonFromTextarea(textarea, fallback = null) {
  return parseJson(textarea?.value ?? '', fallback);
}

export function writeJsonToTextarea(textarea, value, spaces = 2) {
  if (!textarea) return;
  textarea.value = formatJson(value, spaces);
}

export function assertJsonObject(value, label = 'JSON') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' muss ein Objekt sein.');
  }
  return value;
}

export function assertJsonArray(value, label = 'JSON') {
  if (!Array.isArray(value)) {
    throw new Error(label + ' muss ein Array sein.');
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortKeys(value[key]);
    return acc;
  }, {});
}
