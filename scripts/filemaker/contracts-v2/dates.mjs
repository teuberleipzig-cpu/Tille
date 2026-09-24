import { calendarDayNumber, assertConsecutiveDays } from '../../../public/site/js/event-date-rules.js';

export function normalizeDate(value) {
  if (typeof value !== 'string') throw new Error('Datum: Text erforderlich.');
  const result = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || result.startsWith('0000')) {
    throw new Error('Datum: YYYY-MM-DD erforderlich (Jahr 0001–9999).');
  }
  if (!Number.isFinite(calendarDayNumber(result))) {
    throw new Error('Datum: Kalendertag existiert nicht.');
  }
  return result;
}

export function normalizeDates(value) {
  if (!Array.isArray(value) || !value.length || value.length > 31) {
    throw new Error('dates: 1 bis 31 Einträge erforderlich.');
  }
  const dates = [...new Set(value.map(normalizeDate))].sort();
  assertConsecutiveDays(dates);
  return dates;
}

export function normalizeDatePatch(input) {
  const patch = {};
  if (Object.hasOwn(input, 'date')) patch.date = normalizeDate(input.date);
  if (Object.hasOwn(input, 'dates')) {
    patch.dates = normalizeDates(input.dates);
    if (patch.date !== undefined && patch.date !== patch.dates[0]) {
      throw new Error('date muss dem ersten dates-Wert entsprechen.');
    }
    patch.date = patch.dates[0];
  }
  return patch;
}
