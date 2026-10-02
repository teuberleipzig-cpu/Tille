// Synthetic C2 fixtures only; never written to public content directories.
export const fixtureEvent = (id, dates, extra = {}) => ({
  id, date: dates[0], ...(dates.length > 1 ? { dates } : {}), title: `Fixture ${id}`,
  color: 'orange', sections: [{ label: 'up:', genre: 'House', items: [
    { name: 'Fixture Artist', info: 'Live', link: 'https://example.com/artist' }
  ] }], ...extra
});

export const categoryFixture = { events: [
  ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map((id, i) => fixtureEvent(id, [`2026-10-${12 + i}`])),
  fixtureEvent('same-month', ['2026-10-16', '2026-10-17', '2026-10-18']),
  fixtureEvent('cross-month', ['2026-10-31', '2026-11-01', '2026-11-02']),
  fixtureEvent('cross-year', ['2026-12-31', '2027-01-01', '2027-01-02']),
  fixtureEvent('november-single', ['2026-11-01']),
  fixtureEvent('global-search', ['2027-03-01']),
  fixtureEvent('hidden', ['2026-11-03'], { status: 'archived' })
] };
