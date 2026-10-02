import { effectiveEventId, eventDates, eventMonthKeys } from './event-storage-model.js?v=event-storage-model-3';

export const EVENT_CATEGORIES = Object.freeze([
  ['monday', 'MONTAG', '#9EB99B'], ['tuesday', 'DIENSTAG', '#ADA0C6'],
  ['wednesday', 'MITTWOCH', '#CC99AF'], ['thursday', 'DONNERSTAG', '#88B9B3'],
  ['friday', 'FREITAG', '#7B9EC8'], ['saturday', 'SAMSTAG', '#E49A78'],
  ['sunday', 'SONNTAG', '#C8B48C'], ['extended', 'ÜBERLÄNGE', '#E8CB7A']
].map(([key, label, color]) => Object.freeze({ key, label, color })));

export function eventCategory(event) {
  const dates = eventDates(event);
  const index = dates.length > 1 ? 7 : (new Date(`${dates[0]}T00:00:00Z`).getUTCDay() + 6) % 7;
  return EVENT_CATEGORIES[index];
}

export function eventDateLabel(event) {
  const dates = eventDates(event), first = dates[0], last = dates.at(-1);
  const [y, m, d] = first.split('-'), [ey, em, ed] = last.split('-');
  if (dates.length === 1) return `${d}.${m}.${y}`;
  if (y !== ey) return `${d}.${m}.${y}–${ed}.${em}.${ey}`;
  if (m !== em) return `${d}.${m}.–${ed}.${em}.${ey}`;
  return `${d}.–${ed}.${em}.${ey}`;
}

export function visibleMonthEvents(events, month) {
  const seen = new Set();
  return events.filter(event => {
    const id = effectiveEventId(event);
    if (event.status === 'archived' || seen.has(id) || !eventMonthKeys(event).includes(month)) return false;
    seen.add(id);
    return true;
  }).sort((a, b) => {
    const first = event => eventDates(event).find(day => day.startsWith(month + '-'));
    // Stable sort keeps the existing source order on ties.
    return first(a).localeCompare(first(b));
  });
}

export function monthCategories(events) {
  const available = new Set(events.filter(e => e.status !== 'archived').map(e => eventCategory(e).key));
  return EVENT_CATEGORIES.filter(category => available.has(category.key));
}

export function calendarEvents(events, month) {
  const days = new Map();
  for (const event of visibleMonthEvents(events, month)) {
    for (const date of eventDates(event).filter(day => day.startsWith(month + '-'))) {
      const day = Number(date.slice(8));
      if (!days.has(day)) days.set(day, []);
      days.get(day).push(event);
    }
  }
  return days;
}
