export const clone = value => structuredClone(value);
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fields = new Set(('name city genre labels relatedProjects bio description text about ' +
  'instagramUrl instagram instagramLink soundcloudUrl soundcloud soundcloudLink ' +
  'raUrl residentAdvisorUrl ra residentAdvisor discogsUrl discogs bandcampUrl bandcamp ' +
  'bookingEmail booking email newsItems photoList photos presskitUrl presskit pressKitUrl ' +
  'embeds mediaEmbeds releases').split(' '));
export function selectTarget(data, identity) {
  if (!Array.isArray(data?.residents) || !data.residents.length) throw new Error('Residents-Datensatz fehlt oder ist leer.');
  if (!identity.id && !identity.invite) throw new Error('Resident-Link ungültig oder noch nicht veröffentlicht.');
  const matches = data.residents.filter(r => (!identity.id || r.id === identity.id) &&
    (!identity.invite || r.portal?.inviteId === identity.invite));
  if (matches.length !== 1 || !matches[0].id) throw new Error('Resident/Invite nicht eindeutig oder nicht mehr gültig. Bitte neu laden.');
  if (data.residents.filter(r => r.id === matches[0].id).length !== 1) throw new Error('Resident-ID ist nicht eindeutig.');
  if (matches[0].portal?.enabled !== true) throw new Error('Resident-Zugang ist deaktiviert.');
  return matches[0];
}
export function codeMatches(resident, code) {
  const normalize = value => String(value || '').replace(/[\s-]/g, '').toUpperCase();
  return Boolean(normalize(code) && normalize(code) === normalize(resident.portal?.code));
}
export function validateLogin(preload, fresh, code) {
  if (fresh.id !== preload.id || !equal(fresh.portal, preload.portal)) {
    throw new Error('Resident-Zugang wurde seit dem Laden verändert. Bitte neu laden.');
  }
  if (!codeMatches(fresh, code)) throw new Error('Code falsch. Erwartet wird der aktuelle Code aus dem Admin.');
}
export function patchResident(data, identity, rawBaseline, viewBaseline, edited) {
  const current = selectTarget(data, identity);
  if (edited.id !== identity.id || !equal(edited.portal, viewBaseline.portal)) throw new Error('Resident-ID oder Accessdaten dürfen nicht geändert werden.');
  const next = clone(current);
  for (const field of new Set([...Object.keys(viewBaseline), ...Object.keys(edited)])) {
    if (equal(viewBaseline[field], edited[field])) continue;
    if (!fields.has(field)) throw new Error(`Nicht editierbares Residentfeld: ${field}`);
    if (!equal(rawBaseline[field], current[field])) throw new Error(`Konflikt im Feld ${field}. Bitte neu laden.`);
    if (edited[field] === undefined) throw new Error('Felder dürfen nicht implizit entfernt werden.');
    if (/data:|blob:/i.test(JSON.stringify(edited[field]))) throw new Error('Data-/Blob-URLs dürfen nicht gespeichert werden.');
    next[field] = clone(edited[field]);
  }
  return { ...clone(data), residents: data.residents.map(r => r.id === identity.id ? next : clone(r)) };
}
export function draftKey(context, id) {
  if (context.environment !== 'staging' || !id) throw new Error('Entwurf ohne Staging-Resident gesperrt.');
  return `residentPortalDraft:staging:${id}`;
}
