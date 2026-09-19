import { normalizeDate } from './dates.mjs';
import { artistUrl, contractObject, contractText } from './text.mjs';

export const MAX_TIMETABLE_SLOTS = 40;
const berlin = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

export function berlinTimestamp(value) {
  if (typeof value !== 'string') throw new Error('Zeit: ISO-Text erforderlich.');
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new Error('Zeit: ISO-Datetime mit numerischem Offset erforderlich.');
  normalizeDate(match[1]);
  if (+match[2] > 23 || +match[3] > 59 || +match[4] > 59) throw new Error('Zeit: ungültige Uhrzeit.');
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) throw new Error('Zeit: ungültiger Offset.');
  const parts = Object.fromEntries(berlin.formatToParts(instant).map(p => [p.type, p.value]));
  const local = `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  if (local !== value.slice(0, 19)) throw new Error('Zeit: Offset/lokale Zeit passt nicht zu Europe/Berlin.');
  return instant;
}

function normalizeArtist(value) {
  contractObject(value, ['name', 'info', 'link'], 'Artist');
  return {
    name: contractText(value.name, 'Artistname', 300, true),
    info: Object.hasOwn(value, 'info') ? contractText(value.info, 'Artistinfo', 1000) : '',
    link: Object.hasOwn(value, 'link') ? artistUrl(value.link) : ''
  };
}

function normalizeSlot(value) {
  contractObject(value, ['start', 'end', 'floor', 'artists'], 'Slot');
  const start = berlinTimestamp(value.start), end = berlinTimestamp(value.end);
  if (end <= start) throw new Error('Slot: end muss nach start liegen.');
  if (!Array.isArray(value.artists) || !value.artists.length || value.artists.length > 10) {
    throw new Error('Slot: 1 bis 10 Artists erforderlich.');
  }
  return {
    start: value.start, end: value.end,
    floor: contractText(value.floor, 'Floor', 300, true),
    artists: value.artists.map(normalizeArtist)
  };
}

export function normalizeTimetable(value) {
  if (value === null) return null;
  contractObject(value, ['slots'], 'Timetable');
  if (!Array.isArray(value.slots) || !value.slots.length || value.slots.length > MAX_TIMETABLE_SLOTS) {
    throw new Error(`Timetable: 1 bis ${MAX_TIMETABLE_SLOTS} Slots erforderlich.`);
  }
  // Stable chronological order; simultaneous slots and same-floor overlaps are allowed.
  return { slots: value.slots.map(normalizeSlot).sort((a, b) => Date.parse(a.start) - Date.parse(b.start)) };
}
