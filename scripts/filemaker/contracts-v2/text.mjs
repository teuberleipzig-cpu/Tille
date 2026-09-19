// Foundation only: no production imports. Security patterns mirror the V1 parser.
const SECRET = /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/;
const ACTIVE = /[<>]|(?:javascript|data|blob):|;base64,/i;

export function contractText(value, label, max, required = false) {
  if (typeof value !== 'string') throw new Error(`${label}: Text erforderlich.`);
  if (/[\p{Cc}\p{Cf}]/u.test(value)) throw new Error(`${label}: Steuerzeichen verboten.`);
  if (SECRET.test(value)) throw new Error(`${label}: mögliches Secret.`);
  if (ACTIVE.test(value)) throw new Error(`${label}: aktiver Inhalt verboten.`);
  const result = value.normalize('NFC').trim();
  if ([...result].length > max) throw new Error(`${label}: maximal ${max} Zeichen.`);
  if (required && !result) throw new Error(`${label}: darf nicht leer sein.`);
  return result;
}

export function contractObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label}: Objekt erforderlich.`);
  }
  if (Object.keys(value).some(key => !keys.includes(key))) {
    throw new Error(`${label}: unbekanntes Feld.`);
  }
  return value;
}

export function artistUrl(value) {
  const result = contractText(value, 'Artistlink', 2000);
  if (!result) return '';
  let url;
  try { url = new URL(result); } catch { throw new Error('Artistlink: ungültige URL.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Artistlink: nur HTTP/HTTPS ohne Credentials erlaubt.');
  }
  return result;
}
