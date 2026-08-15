const DELIMITERS = [',', ';', '\t'];
const DATE_NAMES = ['date', 'datum', 'day', 'event date'];
const TEXT_NAMES = ['text', 'news', 'title', 'beschreibung', 'description'];

function clean(value) {
  return String(value ?? '').trim();
}

export function detectCsvDelimiter(text) {
  const counts = new Map(DELIMITERS.map(delimiter => [delimiter, 0]));
  let quoted = false;
  for (let index = 0; index < String(text).length; index++) {
    const char = String(text)[index];
    if (char === '"') {
      if (quoted && String(text)[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (!quoted && counts.has(char)) counts.set(char, counts.get(char) + 1);
    else if (!quoted && (char === '\r' || char === '\n')) break;
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}

export function parseResidentNewsCsv(value) {
  const text = String(value ?? '').replace(/^\uFEFF/, '');
  const delimiter = detectCsvDelimiter(text);
  const records = [];
  let fields = [], field = '', quoted = false, line = 1, rowLine = 1;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else quoted = false;
      } else {
        field += char;
        if (char === '\n') line++;
      }
    } else if (char === '"' && field === '') quoted = true;
    else if (char === delimiter) { fields.push(field); field = ''; }
    else if (char === '\r' || char === '\n') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      fields.push(field);
      if (fields.some(item => clean(item))) records.push({ line: rowLine, fields });
      fields = []; field = ''; line++; rowLine = line;
    } else field += char;
  }
  if (quoted) throw new Error(`Nicht geschlossenes Anführungszeichen ab Zeile ${rowLine}.`);
  fields.push(field);
  if (fields.some(item => clean(item))) records.push({ line: rowLine, fields });
  if (!records.length) throw new Error('CSV enthält keine Headerzeile.');
  const headers = records[0].fields.map(clean);
  if (!headers.some(Boolean)) throw new Error('CSV enthält keine Headerzeile.');
  return { delimiter, headers, rows: records.slice(1) };
}

export function suggestResidentNewsMapping(headers) {
  const normalized = headers.map(header => clean(header).toLocaleLowerCase('de'));
  const find = names => normalized.findIndex(header => names.includes(header));
  return { date: find(DATE_NAMES), text: find(TEXT_NAMES) };
}

export function normalizeResidentNewsDate(value) {
  const raw = clean(value);
  let year, month, day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) [year, month, day] = raw.split('-').map(Number);
  else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(raw)) [day, month, year] = raw.split('.').map(Number);
  else return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function residentNewsKey(item) {
  return `${clean(item?.date)}\u0000${clean(item?.text)}`;
}

export function isResidentNewsImportSessionCurrent(session, residentId) {
  return Boolean(session?.residentId && session.residentId === clean(residentId));
}

export function buildResidentNewsPreview(parsed, mapping, existingNews = []) {
  if (!Number.isInteger(mapping?.date) || mapping.date < 0 || !Number.isInteger(mapping?.text) || mapping.text < 0) {
    throw new Error('Bitte Datum und Text einer CSV-Spalte zuordnen.');
  }
  const existingKeys = new Set((Array.isArray(existingNews) ? existingNews : []).map(residentNewsKey));
  const csvKeys = new Set();
  return parsed.rows.map(record => {
    const rawDate = clean(record.fields[mapping.date]);
    const text = clean(record.fields[mapping.text]);
    const date = normalizeResidentNewsDate(rawDate);
    let status = 'valid', message = '';
    if (!date) { status = 'invalid'; message = `Ungültiges Datum ${rawDate || '(leer)'}.`; }
    else if (!text) { status = 'invalid'; message = 'Text ist leer.'; }
    const key = `${date}\u0000${text}`;
    if (status === 'valid' && csvKeys.has(key)) status = 'csv-duplicate';
    else if (status === 'valid' && existingKeys.has(key)) status = 'existing-duplicate';
    if (status === 'valid') csvKeys.add(key);
    return { line: record.line, date, rawDate, text, status, included: status === 'valid', message };
  });
}

export function mergeResidentNews(existingNews, previewRows) {
  const existing = Array.isArray(existingNews) ? existingNews.map(item => structuredClone(item)) : [];
  const knownKeys = new Set(existing.map(residentNewsKey));
  const additions = (Array.isArray(previewRows) ? previewRows : [])
    .filter(row => row.included && row.status === 'valid')
    .filter(row => {
      const key = residentNewsKey(row);
      if (knownKeys.has(key)) return false;
      knownKeys.add(key);
      return true;
    })
    .map(row => ({ date: row.date, text: row.text }));
  return [...existing, ...additions].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || '')) || String(a.text || '').localeCompare(String(b.text || ''), 'de'));
}

export function patchResidentNews(document, residentId, nextNewsItems) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('residents.json ist ungültig.');
  if (!Array.isArray(document.residents) || !document.residents.length) throw new Error('residents[] ist leer. Speichern abgebrochen.');
  const id = clean(residentId);
  if (!id) throw new Error('Resident-ID fehlt. Speichern abgebrochen.');
  const matches = document.residents.reduce((out, resident, index) => resident?.id === id ? [...out, index] : out, []);
  if (!matches.length) throw new Error(`Resident ${id} wurde im aktuellen residents.json nicht gefunden.`);
  if (matches.length > 1) throw new Error('Resident ist mehrfach vorhanden. Speichern abgebrochen.');
  const result = structuredClone(document);
  const index = matches[0];
  result.residents[index] = { ...result.residents[index], newsItems: structuredClone(nextNewsItems) };
  return result;
}
