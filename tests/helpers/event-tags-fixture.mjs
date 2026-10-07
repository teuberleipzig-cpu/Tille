import { fixtureEvent } from './event-categories-fixture.mjs';

// Synthetic only. Persisted casing may differ between events, not within a key.
export const tagFixture = { events: [
  fixtureEvent('friday-house', ['2026-10-16'], { tags: ['HOUSE'] }),
  fixtureEvent('friday-techno', ['2026-10-23'], { tags: ['TECHNO', 'Langer Tag '.repeat(5).trim()] }),
  fixtureEvent('saturday-house', ['2026-10-17'], { tags: ['House', 'LIVE'] }),
  fixtureEvent('no-tags', ['2026-10-18']),
  fixtureEvent('festival', ['2026-10-31', '2026-11-01'], { tags: ['FESTIVAL', 'LIVE'] }),
  fixtureEvent('november-house', ['2026-11-06'], { tags: ['HOUSE'] }),
  fixtureEvent('archived', ['2026-10-20'], { tags: ['HIDDEN'], status: 'archived' })
] };
