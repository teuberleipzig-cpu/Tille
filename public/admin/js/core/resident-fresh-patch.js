// Three-way field patch: only browser intent, never a stale whole document.
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const copy = value => value === undefined ? undefined : structuredClone(value);
const protectedKey = key => /portal|invite|access/i.test(key);
const unsafeUrl = value => typeof value === 'string' ? /^(data|blob):/i.test(value.trim())
  : value && typeof value === 'object' && Object.values(value).some(unsafeUrl);
function retainsFields(raw, view) {
  if (Array.isArray(raw)) return Array.isArray(view) && raw.length === view.length && raw.every((item, i) => retainsFields(item, view[i]));
  if (object(raw)) return object(view) && Object.keys(raw).every(key => Object.hasOwn(view, key) && retainsFields(raw[key], view[key]));
  return true;
}

function patch(base, draft, fresh, root = false, raw) {
  if (equal(base, draft)) return copy(fresh);
  if (object(base) && object(draft) && object(fresh)) {
    const next = copy(fresh);
    for (const key of new Set([...Object.keys(base), ...Object.keys(draft)])) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new Error('Unsicheres Resident-Feld.');
      if (root && (key === 'id' || protectedKey(key))) continue;
      if (equal(base[key], draft[key])) continue;
      const value = patch(base[key], draft[key], fresh[key], false, raw?.[key]);
      if (value === undefined) delete next[key]; else next[key] = value;
    }
    return next;
  }
  if (!equal(fresh, raw) && !equal(fresh, draft)) throw new Error('Resident-Feld wurde inzwischen geändert. Bitte neu laden.');
  if (Array.isArray(base) && Array.isArray(draft) && Array.isArray(fresh)) {
    // Do not replace normalized arrays if doing so would discard unrepresented fields.
    if (!retainsFields(raw, base)) throw new Error('Normalisierte Liste benötigt vor dem Speichern eine gezielte Prüfung. Unbekannte Felder bleiben erhalten.');
  }
  return copy(draft);
}

function byId(document) {
  if (!Array.isArray(document?.residents) || !document.residents.length) throw new Error('Residents: residents[] ist leer oder ungültig.');
  const map = new Map();
  for (const resident of document.residents) {
    if (!resident?.id || map.has(resident.id)) throw new Error('Resident-ID fehlt oder ist mehrfach vorhanden.');
    map.set(resident.id, resident);
  }
  return map;
}

export function patchResidentDocument({ baseline, rawBaseline = baseline, draft, fresh, allowLoss = false }) {
  const old = byId(baseline), wanted = byId(draft), latest = byId(fresh);
  const raw = byId(rawBaseline);
  const deleted = [...old.keys()].filter(id => !wanted.has(id));
  if (deleted.length && !allowLoss) throw new Error('Resident-Verlust muss ausdrücklich bestätigt werden.');
  const next = copy(fresh);
  for (const id of deleted) {
    if (!equal(raw.get(id), latest.get(id))) throw new Error('Zu löschender Resident wurde inzwischen geändert. Bitte neu laden.');
  }
  next.residents = next.residents.filter(r => !deleted.includes(r.id)).map(r => {
    if (!old.has(r.id) || !wanted.has(r.id)) return r;
    return patch(old.get(r.id), wanted.get(r.id), r, true, raw.get(r.id));
  });
  for (const [id, value] of wanted) {
    if (old.has(id)) {
      if (!latest.has(id)) throw new Error('Resident wurde inzwischen entfernt. Bitte neu laden.');
    } else {
      if (latest.has(id)) throw new Error('Neue Resident-ID existiert inzwischen. Bitte neu laden.');
      if (Object.keys(value).some(protectedKey)) throw new Error('Resident Access ist vorübergehend gesperrt.');
      next.residents.push(copy(value));
    }
  }
  const oldOrder = [...old.keys()].filter(id => wanted.has(id));
  const wantedOrder = [...wanted.keys()].filter(id => old.has(id));
  if (!equal(oldOrder, wantedOrder)) {
    if (!equal([...latest.keys()], [...old.keys()])) throw new Error('Resident-Reihenfolge wurde inzwischen geändert. Bitte neu laden.');
    const positions = [...wanted.keys()]; next.residents.sort((a, b) => positions.indexOf(a.id) - positions.indexOf(b.id));
  }
  if (unsafeUrl(next)) throw new Error('Residentdaten dürfen keine Data-/Blob-URLs enthalten.');
  return next;
}
