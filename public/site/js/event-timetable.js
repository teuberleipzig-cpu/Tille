// Foundation and its dependencies are browser-neutral; keep one Berlin/DST contract.
import { normalizeTimetable } from './event-timetable-contract.js?v=event-timetable-contract-1';

function sameValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && sameValue(a[key], b[key]));
}

export function eventTimetable(event) {
  if (!Object.hasOwn(event, 'timetable')) return null;
  const value = event.timetable;
  if (!value || typeof value !== 'object' || !Array.isArray(value.slots)) throw new Error('Timetable: ungültiger persistierter Wert.');
  // Empty floor is the persisted Foundation default, not valid explicit input.
  const input = { ...value, slots: value.slots.map(slot => {
    if (!slot || typeof slot !== 'object' || Array.isArray(slot)) return slot;
    const copy = { ...slot };
    if (copy.floor === '') delete copy.floor;
    return copy;
  }) };
  const normalized = normalizeTimetable(input);
  if (!sameValue(value, normalized)) throw new Error('Timetable: persistierte Daten sind nicht normalisiert.');
  return structuredClone(value);
}

export function timetableDays(timetable) {
  const days = new Map();
  for (const slot of timetable.slots) {
    const day = slot.start.slice(0, 10);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(slot);
  }
  return [...days].map(([day, slots]) => {
    const floors = new Map();
    for (const slot of slots) {
      if (!floors.has(slot.floor)) floors.set(slot.floor, []);
      floors.get(slot.floor).push(slot);
    }
    return { day, floors: [...floors].map(([floor, items]) => ({ floor, slots: items })) };
  });
}

const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const weekdays = ['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];
function artistHtml(artist) {
  const name = `<strong>${escape(artist.name)}</strong>`;
  return `<span class="timetable-artist">${artist.link ? `<a href="${escape(artist.link)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name}${artist.info ? ` (${escape(artist.info)})` : ''}</span>`;
}
function slotHtml(slot) {
  return `<div class="timetable-slot"><span class="timetable-time">${slot.start.slice(11,16)}–${slot.end.slice(11,16)}</span><div class="timetable-artists">${slot.artists.map(artistHtml).join(' ')}</div></div>`;
}
export function renderEventTimetable(event) {
  const timetable = eventTimetable(event);
  if (!timetable) return '';
  return `<section class="event-timetable" aria-label="Timetable">${timetableDays(timetable).map(({day, floors}) => {
    const [y,m,d] = day.split('-');
    const label = `${weekdays[new Date(`${day}T12:00:00Z`).getUTCDay()]} · ${d}.${m}.${y}`;
    return `<section class="timetable-day"><h2>${label}</h2>${floors.map(group => `${group.floor ? `<h3>${escape(group.floor)}</h3>` : ''}${group.slots.map(slotHtml).join('')}`).join('')}</section>`;
  }).join('')}</section>`;
}
