# C3 — Event tags and combined filters

## Scope and contract

Implemented on `codex/event-tags-filter-c3`, based on main
`a65995f3a746569d7f3874ed56967d04a378e1da`.
FileMaker upserts reuse `normalizeTags`: at most 20 input entries before deduplication,
trim/NFC, at most 60 Unicode code points, safe nonempty text, first payload spelling
per lowercase/NFC key. Absent tags preserve existing tags; supplied tags replace;
`[]` clears. Existing spelling for the same event/key wins, in payload order.
Unknown event fields remain preserved. Timetable and environment remain rejected.
Persisted tags are validated fail-closed, never silently repaired.

Category is single-select; tags are multi-select: **category AND (tag A OR tag B)**.
Options come from the unfiltered, sorted visible month, excluding archived events.
First occurrence determines option order and display spelling. Month changes prune
unavailable selections. Search clears both filter kinds; filter clicks clear search.
The tag DOM owner only manages its own buttons, reusing nodes with `aria-pressed`.

Tags are searchable with one search identity per event, including multi-month events.
Escaped, neutral tags appear below the title and before sections in all four views:
Dates list, query detail, event.html and static SEO pages. Empty tags add no container.
Static pages without tags retain their existing output; no bulk regeneration ran.

## Read-only content inventory

Inspected staging `2b907632c17dfbeefce4fce4f70d6e63e9e9134b`:
1,568 unique events, **0 own tags fields, 0 tag keys**.
No existing-page refresh is needed. Live baseline:
`959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
No production data, generated pages, sitemap or media changed.

## Automated validation

Fresh pre-change baseline: **299/299 PASS** across the eight requested suites.
Final local run: **455/455 PASS**, no skips, across:

```
node --test tests/event-contract-v2.test.mjs tests/event-tags.test.mjs tests/event-categories.test.mjs tests/monthly-event-storage.test.mjs tests/event-multidate-storage.test.mjs tests/filemaker-event-intake.test.mjs tests/filemaker-staging-workspace.test.mjs tests/event-seo.test.mjs tests/dates-mobile.test.mjs tests/content-composition-workflow.test.mjs tests/admin-event-image-only.test.mjs tests/admin-event-image-only-ui.test.mjs tests/admin-staging-ui.test.mjs tests/event-contract-v2-timetable.test.mjs
```

Includes malformed persisted tags, input boundaries, replacement/preservation/clear,
unknown fields, multi-month search, combined filters, button reuse, escaping, unchanged
sitemap identity and isolated writer scope (own month/search/HTML only).
Two stale Admin cache-version assertions were updated to the new actual versions;
no safety assertions or tests were removed to make them pass.

## Browser QA — synthetic only

GET-only in-memory fixture: `node tests/helpers/serve-event-categories-fixture.mjs --tags`.
Actual local origin during QA: `http://127.0.0.1:9841`.
Desktop **1280 x 900 PASS**, mobile **390 x 844 PASS**.

Checked `/index.html?month=2026-10`, November via next-month, December without tags,
`/index.html?event=friday-techno`, `/event.html?id=friday-techno`,
`/events/friday-techno/` and `/events/festival/`.

- October: no filter 5 events; Friday 2; HOUSE 2; HOUSE+TECHNO 3;
  Friday+HOUSE+TECHNO 2. Deselection and keyboard Space work.
- Month change preserves HOUSE and removes unavailable TECHNO; options remain based
  on the full month. Search resets both filter kinds. Tag click clears search.
- FESTIVAL search yields one result across two months; HOUSE search yields three.
- Reload resets non-persisted filters. Filtered calendar opens the correct static
  detail and retains the complete multi-day date range.
- Mobile panel uses the existing toggle; summary correctly reports 3 active filters
  or search hit count. Tag targets at least 44px high; long tags wrap.
- No horizontal overflow on checked list/detail pages. Empty December tag area is
  hidden with height 0. Tags are below titles, neutral, with preserved lineups.
- No observed browser console errors or failed fixture requests during QA; required
  local modules/styles and fixture data loaded. No Admin/Portal/FileMaker writes.

## Cache ownership

Storage model/store v4; presentation v2; new tag model/filter/style v1.
Shared SEO cache key `event-seo-tags-1`; Admin storage/image-save v4 and secondary
loaders `admin-event-tags-1`. Admin changes are cache-only, not a tag editor.
Unchanged category/nav/mobile-layout versions remain unchanged.
PR smoke paths cover the new foundation, modules, CSS, tests and fixture.

## Deliberately open

Exact-head GitHub PR smoke is a separate completion gate recorded with the PR/run.
No merge, auto-merge, deploy, workflow dispatch or content-branch write authorized.
Real FileMaker-tags E2E, FileMaker dates[] E2E, Timetable C4 and independent known
findings (including desktop-to-mobile search focus) remain separate work.
