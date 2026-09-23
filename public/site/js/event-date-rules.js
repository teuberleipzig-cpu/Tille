// Shared by input normalization, persisted storage and browser/SEO presentation.
// UTC calendar-day ordinals are independent of DST and the machine timezone.
export function calendarDayNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return NaN;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.getTime() / 86400000 : NaN;
}

export function assertConsecutiveDays(dates) {
  for (let i = 1; i < dates.length; i++) {
    if (calendarDayNumber(dates[i]) - calendarDayNumber(dates[i - 1]) !== 1) {
      throw new Error('Mehrtagesevents müssen an aufeinanderfolgenden Tagen stattfinden.');
    }
  }
}
