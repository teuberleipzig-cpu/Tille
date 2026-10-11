# P4 — WordPress Pages: About and History

## Scope and ownership

This is a code-only foundation, not an executed WordPress publication. Only
`about.html` and `history.html` are Pages-generated outputs. Contact, News, legal
pages, navigation, events, residents, gallery, media and sitemap are not outputs.
The existing News workflow and modules are unchanged. No browser REST client is
introduced; a WordPress outage does not affect the already published static site.

Both root files remain functional code templates containing the current editorial
fallback. Their manifest classification is GENERATED. The composer retains each
code fallback only while that exact file is absent from the content snapshot;
other namespaces keep their existing deletion semantics. Published content wins
at composition time. A subsequent Pages sync always reads the shell from the
immutable **code SHA**, not the composed site or previous generated content.

The markers `TILLE:WORDPRESS:ABOUT:START/END` and
`TILLE:WORDPRESS:HISTORY:START/END` must each occur exactly once, in order.
Only text between the corresponding HTML comments is replaced. History's source
line belongs inside the managed block. H1, title/meta/canonical/OG/Twitter,
navigation, footer, scripts and styles remain code-owned. Scoped inline image
width/wrapping rules support editorial images without changing other pages.
External JS/CSS chains and their cache versions are unchanged.

## Configuration and source safety

Repository variables, not secrets:

- `WORDPRESS_BASE_URL`: the existing sole source URL contract.
- `WORDPRESS_ABOUT_PAGE_ID`: a positive safe integer.
- `WORDPRESS_HISTORY_PAGE_ID`: a different positive safe integer.

There are no defaults, slug lookups or guessed operational IDs. Both IDs are
validated before any fetch. Test IDs are synthetic only. Real IDs still require
human confirmation and configuration; no repository variables were changed.

The client reads the two exact `/wp-json/wp/v2/pages/<ID>?context=view` endpoints
without credentials, refuses redirects and applies a bounded timeout including
body parsing. ID mismatch, unpublished/protected content, malformed shape/JSON,
HTTP errors, invalid supplied modification timestamps and empty sanitized content
fail closed. No fallback to another source and no automatic retry.

The internal model contains sourceId, status, diagnostic title, contentHtml and
optional modifiedAt. The **unchanged News sanitizer** removes active markup,
unsafe URL schemes and handlers; its existing output safety scan is reused.
Raw editorial H1 is rejected before sanitizing because the News sanitizer would
otherwise strip it. No silent H1-to-H2 rewrite. Safe paragraphs, H2/H3, lists,
links and HTTP(S) inline images follow the existing sanitizer contract. No featured
image placement, download or media mirroring. Allowed external inline images can
still be loaded from their media host; there is no browser WordPress REST fetch.

## Modules and immutable staging write

`scripts/wordpress-pages/` separates configuration, REST client, model, template
rendering, content commit, PR ownership, publication and CLI responsibilities.
It reuses central environment/SHA/snapshot/composition/content validation,
News sanitizer/output checks, Git plumbing and the generic GitHub API helper.

The workflow must run from main in the expected repository. Its executable
checkout must equal the bound workflow SHA and current remote main. It freshly
binds `content/staging`; all subsequent checks reject either SHA moving.
The complete existing content tree supplies the parent and every unchanged blob.
Only actual changed About/History blobs are replaced. The result is a verified
single-parent commit; full-tree validation and actual diff-tree must match the
prevalidated sorted diff. Navigation, sitemap and binary media remain byte-identical.

No-op creates no Git objects, commit, push or PR. An existing verified own stale
Draft may close. An orphan/foreign branch fails even on no-op.

## Workflow and PR contract

`.github/workflows/wordpress-pages-sync.yml` is manual `workflow_dispatch` only:

- explicit `environment`: staging/live, **no default**;
- `mode`: validate-only/sync-pr;
- live fails before source access: `Live WordPress publishing is not activated yet.`;
- validate-only: `contents: read`, no publication;
- sync-pr: `contents: write`, `pull-requests: write` only;
- no Actions/package-write, SSH, deploy, schedule, webhook or auto-merge.

The concurrency group deliberately matches News: `wordpress-news-sync`,
`cancel-in-progress: false`. This serializes these two workflow runs within the
repository. It does not pause other content writers or replace SHA gates.

The candidate branch is exactly `automation/wordpress-pages/staging`, with a
Draft PR against `content/staging` and marker
`<!-- tille:wordpress-pages-sync:staging:v1 -->`.
Both repositories, refs, bot author, marker, Draft/auto-merge state, base/head
SHAs and the complete paginated file list must match. Only added/modified
About/History paths are accepted, never deletes/renames or arbitrary root pages.
Existing branches require proven PR ownership; updates use an exact predecessor
lease. No main/content ref is pushed by this writer. SHA drift or uncertain API
results abort without retry, catch-up, rollback or automatic merge.

## Verification

Baseline: 323 tests, 320 PASS, three pre-existing Windows CRLF workflow-regex
failures. No News implementation or workflow changed.

New suites: `wordpress-pages.test.mjs`, `wordpress-pages-content.test.mjs`,
`wordpress-pages-pr.test.mjs`, `wordpress-pages-workflow.test.mjs`. They cover
config/REST/security/templates, fallback/code-shell ownership, preservation,
single-parent commit, no-op, SHA races, strict PR provenance and workflow gates.
Content-foundation cases classify both new outputs. Heading tests require the
explicit new marker between the unchanged fallback H1 and H2.

The first full working-tree run had 1446 tests: 1438 PASS, eight FAIL. Three
P4-related checks were resolved (explicit CI suite names and two marker-aware
heading assertions); their targeted rerun passed 17/17. The remaining five are
historical CRLF artifacts: SVG byte hash, Resident HTML bytes and three News
workflow regexes. No production asset/page regeneration or global EOL change.
Final full LF-export suite: **1446/1446 PASS, 0 FAIL, 0 SKIP**, Node 22.22.3.
The export uses per-command `git -c core.autocrlf=false -c core.eol=lf archive`;
no repository/global Git settings changed. An initial archive inherited Windows
conversion and reproduced precisely the five historical failures (1441/1446);
its CRLF bytes were measured before repeating with the explicit LF export.
The original SVG, Resident HTML and News workflow match their unchanged Git
objects exactly after CRLF-to-LF comparison. All existing News tests pass in LF.

Executed test commands (intermediate results retained, not claimed final PASS):

- Baseline: `node --test` with content-foundation, wordpress-staging-content,
  wordpress-staging-pr, headless-wordpress-news, wordpress-news-sync and news-seo.
- Initial Pages + foundation: 181/181 PASS.
- Pages model/content/PR integration: initially 111/120; nine failures shared one
  synthetic fixture's forbidden legacy events.json path. Correcting only the
  fixture to the existing monthly path yielded content integration 11/11 PASS.
- Pages workflow: 4/4 PASS.
- Composition workflow + public headings + Pages workflow after the explicit
  suite-list/marker adjustments: 17/17 PASS.
- Full suite: `node --test tests/*.test.mjs` in working tree and isolated export,
  with the results above. The final LF run includes all 124 new Pages tests and
  the two additional existing-foundation classification cases.
- `git diff --check`: PASS. No new skips or debug/FIXME/XXX/TODO markers.

Browser QA uses the existing GET-only localhost harness:
`node tests/helpers/serve-event-categories-fixture.mjs --wordpress-pages`.
The additional helper generates both pages in memory with synthetic editorial
content and a local existing inline image. No real CMS request or content write.
About and History passed at 1280×900 and 390×844: one correct H1, H2/H3,
paragraph/list/image rendering, active desktop/mobile navigation, navigation
between pages, footer/legal links, reload, no horizontal overflow and no console
errors/warnings. The harness's same-origin CSP allows no external connection;
the fixtures use no WordPress URL as a resource. Tracking code/configuration
remains unchanged; no tracking activation was introduced. Local harness stopped.

## Later operational sequence — NOT executed by P4

After a separately authorized code-PR merge:

1. Confirm the real public About and History IDs and set the two repository vars.
2. On current main, separately authorize `environment=staging`, `mode=validate-only`.
3. Inspect the bound SHAs and complete About/History diff.
4. Separately authorize `environment=staging`, `mode=sync-pr`.
5. Review the generated content Draft, including unchanged navigation/sitemap/media.
6. Recheck exact head/base; merge the content PR only with user approval.
7. Capture the new content/staging SHA.
8. Separately authorize docker-publish with `expected_sha=<current main SHA>` and
   `expected_content_sha=<exact content/staging SHA>`.
9. Verify staging About/History on desktop/mobile.

Live remains blocked. P4 performs none of these operational steps and is not a
global Go-Live completion claim.
