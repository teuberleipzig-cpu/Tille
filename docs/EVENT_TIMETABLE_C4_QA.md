# C4 — Timetable integration QA

## Bound start and inventory

- Code/main: `0f28a76cbcf79fecfe4cc0018691f4f51e9c0c23`.
- content/staging: `2b907632c17dfbeefce4fce4f70d6e63e9e9134b`.
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
- Read-only monthly inventory: 1,568 unique events, zero timetable fields/slots.
- No historic HTML refresh or production data migration needed or performed.

## Contract and ownership

FileMaker upsert: omitted preserves; object completely replaces; null removes the
property. New events without timetable stay without it. Remove remains ID-only.
Existing Foundation API, limits and Berlin/DST validation remain authoritative.
The browser-neutral implementation now lives in event-timetable-contract.js and
event-contract-text.js; Foundation modules re-export it. This avoids new browser
.mjs imports (the existing nginx MIME map serves .js, not .mjs). No server change.

Persisted validation requires normalized fields, text and chronological order;
it compares with the Foundation result and rejects differences, never repairs.
Missing input floor normalizes to empty string; explicit empty input is invalid.
Persisted empty floor is valid. Unknown event fields remain intact.

Rendering groups by local start date, then floor first appearance. Unnamed floors
have no invented heading. All artists are rendered with escaped names/info and
validated HTTP(S) links. Cross-midnight slots remain on their start day.
Timetable never derives dates/months. Search includes floor/name/info/link and
keeps one result per event. Dates overview retains sections; only detail views
replace sections with timetable. No timetable means the existing sections fallback.

## Tests (2026-10-07)

Fresh baseline: **455/455 PASS**, no skips, in the 14 requested existing suites.
Final: **475/475 PASS**, no skips: same suites plus event-timetable.test.mjs.
This includes unchanged Foundation DST tests, fail-closed persisted validation,
apply/clear/preserve, storage reconstruction/search, isolated FileMaker writer,
SEO, Admin fresh image-only preservation and CI/cache import assertions.

Final suites: event-contract-v2, event-contract-v2-timetable, event-timetable,
event-tags, event-categories, monthly-event-storage, event-multidate-storage,
filemaker-event-intake, filemaker-staging-workspace, event-seo, dates-mobile,
admin-event-image-only, admin-event-image-only-ui, admin-staging-ui,
content-composition-workflow (all tests/*.test.mjs).

## Browser QA

Real in-app browser, localhost GET-only in-memory fixture, Desktop 1280×900 and
Mobile 390×844. Helper: serve-event-categories-fixture.mjs --timetable.
Test origin: http://127.0.0.1:37207 (ephemeral; server stopped after QA).

Checked paths:

- index.html?month=2026-10 and next month November.
- events/no-timetable/, events/midnight/, events/days-floors/, events/unnamed/.
- events/multiple-artists/, events/tags-timetable/, events/multi-month-timetable/.
- index.html?event=days-floors and event.html?id=days-floors.

PASS: sections fallback; timetable only in details; day/floor order; unnamed floor;
22:00–23:30 and 23:30–01:00; multiple linked artists; long floor/name/info wrapping;
tags and description retained; return-to-dates navigation; static reload; search
by Timetable Artist and Floor 2 (one matching event for Floor 2).
Mobile panel and Friday AND HOUSE work (two active filters, one event); switching
to November removes both unavailable filters and keeps the multi-month event.
Calendar uses event dates, not the November 2 slot end. No horizontal overflow.
Screenshots visually inspected for desktop days/floors and mobile long artists.
Browser console: zero errors; no failed fixture requests observed.

## Cache / CI

Storage model/store v5, presentation v3, Admin storage/image-only v5,
admin-event-timetable-1 and event-seo-timetable-1. New timetable CSS/JS and shared
contract modules v1. Existing category/tag CSS and filter modules unchanged.
PR smoke includes new suite and paths; public event-*.js wildcard covers shared
contract modules. Existing suites and safety paths retained.

## Scope / open gates

No production event/resident/gallery data, sitemap, media or existing static page
changed. No FileMaker workflow, deploy workflow, nginx or Docker changes. Admin
changes are cache references only; no timetable editor. No real remote save.
Feature PR must remain Draft; exact-head PR CI is a separate remote gate.
Open: real FileMaker timetable/tags/dates[] E2E, known independent focus finding,
later website packages. No merge, deployment, dispatch or content-branch write.
