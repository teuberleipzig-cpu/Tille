# B1e-1 — Staging cutover integration and fresh reconciliation

⚠️ DO NOT MERGE — INTEGRATION REVIEW ONLY

**NO DEPLOYMENT PERFORMED.** This combines the five prepared packages for review,
not activation. No real writer, production WordPress request, content-branch write,
GHCR publish, SSH, main merge or live cutover was performed. Source Drafts remain
open and unchanged. Verification date: 2026-09-21.

## Exact revisions and integration order

- main: `4e723ca23465419b7db53408de5b7e9b05757fdd`
- content/staging: `c96843b1ea447d19f2b93ed9aad4e18637e75edc`
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`
- Integration branch: `codex/staging-cutover-integration`

| Order | Source PR | Exact source head | Integration merge |
| --- | --- | --- | --- |
| 1 | #104 Deployment | `0530f1cf359abe638dabb5cbcfff80f4b29e6f09` | `a59897f` |
| 2 | #105 FileMaker | `52f01f015daeaa854859d1169ae0194c6099a450` | `8a5d907` |
| 3 | #106 Admin | `9c733f9bb4a23ed6e9e7dccee4daa57a3a3b6e03` | `702684a` |
| 4 | #107 Portal | `a9c30d5d9f5986e69058b161e028ca1a66c272cf` | `ed12a93` |
| 5 | #108 WordPress | `63a4512aeabe5fb27a739129634805d2dbb43ec1` | `3f2b78a` |

All five were freshly verified open, Draft, base main at the exact baseline SHA,
exact expected head and no auto-merge. Each source is retained as a separate merge
parent; no squash/rebase or source-branch mutation.

Only merge conflict: `tests/filemaker-event-intake.test.mjs`. Retained #105's new
composed writer/immutable checkout assertions and behavioral staging tests; retained
#104's required **two** deployment inputs and pre-build composition gate assertions.
The obsolete optional/single-SHA assertion is superseded, not copied back. The
main-only FileMaker workflow assertions were already deliberately replaced in #105.
No unexpected production-code conflict and no additional production-code fix.

Integration-owned changes beyond the five sources: this report, one small behavioral
cross-contract test file, two test-only Admin browser mock helpers and the existing
read-only container-smoke workflow invoking the cross-contract tests. No new workflow
or deployment trigger. Mock helpers are never referenced by production HTML.

## Fresh read-only reconciliation — PASS

Re-ran `bootstrap-content-branch.mjs --environment staging --source-sha <main>
--dry-run` and `--environment staging --content-ref content/staging
--content-sha <staging> --validate` using the exact revisions above.

Projected main Content-Tree and actual staging Content-Tree both:
`ec799d6d5eaec51d8633e99bf2e9d967e0f1279f`.

Compared every classified path, mode, blob SHA, classification/rule and inventory
with exact equality: **1,821 files; 243 MUTABLE; 1,578 GENERATED**. No differences,
no migration, no copy/sync in either direction. Staging has zero CODE/UNKNOWN files.

| Rule | Count |
| --- | ---: |
| event-months | 182 |
| event-meta / event-manifest / event-index / event-search | 1 each |
| event-pages | 1568 |
| event-media | 5 |
| residents | 1 |
| resident-images | 52 |
| resident-presskits | 0 |
| resident-pages | 3 |
| news-legacy / news-overview / news-articles | 1 each |
| gallery | 1 |
| gallery-media | 0 |
| navigation / sitemap | 1 each |

## Legacy open work and historical paths

Fresh GitHub open-PR inventory: only #104–#108 and unrelated Draft #12. **No open
legacy content PR against main**, no open Admin test PR. All remain untouched.

Remote branches still include 27 `automation/filemaker-event/<id>` branches,
`automation/wordpress-news-sync`, and five `test/*` branches. Paginated PR history
shows FileMaker legacy PRs closed/merged except closed unmerged Draft #24; WordPress
legacy #39 and #43 are closed/merged. Retained branches are not active open work and
were not deleted or reused. They are not evidence of a writer pause: current main
still contains the old workflows until coordinated activation.

Historical inactive Portal scripts still contain main writers: `portal.js`,
`portal-media.js`, `portal-release-cover-fix.js`, `portal-releases-v2.js`.
The active `index.html` → `app-coverfix.js` import graph does not load them; the
graph test verifies that separation. Admin `core/github-client.js` retains a legacy
main default but is not imported by the active V2 graph; `github-sync.js` delegates
its compatibility globals to the new staging owner. No opportunistic legacy rewrite.
Old deployment examples in `FILEMAKER_EVENT_INTAKE.md`, Docker docs and earlier
package docs are historical, not active dispatches. This report describes the joint
contract; individual package caveats about their then-unmodified siblings are historical.

## Writer, deployment and permission matrix

| Writer | Content target / method | Deployment | Token / minimum capability |
| --- | --- | --- | --- |
| FileMaker | content/staging via one-parent automation content commit, gated PR and verified merge | Both SHAs, workflow ref main | Actions GITHUB_TOKEN; validate contents read; sync contents write, pull-requests write, actions write |
| Admin | content/staging Git Data commit, expected parent, non-force ref update | Both SHAs after saved-content verification | Fine-grained browser token: Contents read/write; Actions write for dispatch |
| Portal | content/staging scoped resident/media Git Data commit, expected parent, non-force ref update | Both SHAs after consistent JSON; media prepares but does not prematurely dispatch | Resident token: Contents read/write; **Actions write remains an explicit capability decision, not approved by this integration** |
| WordPress | content-only automation branch → Draft PR into content/staging | **None**; later human merge and separate dual-SHA deploy | Actions GITHUB_TOKEN; validate contents read; sync contents write + pull-requests write; no actions write |

Exactly three active explicit `docker-publish.yml` dispatch owners remain:

1. `scripts/filemaker/staging-github.mjs`: gh workflow run, ref main,
   `expected_sha=bound code`, `expected_content_sha=verified content merge`.
2. `public/admin/js/core/staging-operation.js`: API dispatch, ref main,
   current main SHA + confirmed saved content SHA.
3. `public/resident-portal/js/core/git-transport.js`: same required pair,
   after content-head checks before/after reading main.

No active single-SHA writer dispatch. `docker-publish.yml` requires both full SHAs
for manual requests and binds them in `bindStagingDeployment`; code-push runs bind
the content snapshot themselves and reject legacy content diffs on main. Test/mock
references and container-smoke workflow path filters are not dispatch owners.
WordPress has no deployment API/CLI call. Permissions are unchanged from the sources.

Main is the code/workflow source, never the migrated writers' content destination.
Admin branch UI is read-only `content/staging`, and tampering fails validation.
Portal rejects any branch query parameter (including empty or content/staging).
FileMaker/WordPress require explicit environment and bind the content ref centrally.

## Live, Resident Access and human review gates

All four live paths fail closed: FileMaker live, Admin live, Portal writes at
www.distillery.de, and WordPress live. No content/live write, live deployment/tag or
implicit fallback. Live remains disabled in Admin UI. The smoke workflow's existing
DEFAULT/LIVE-safety image tests nginx defaults locally using **staging** content;
it is not a live artifact, registry publish or live activation.

Admin Resident Access remains read-only: six disabled actions, no normalization,
autoSaveResidents access mutation, clipboard action or generated invite link.
Portal accepts the eventual branch-free resident/invite link under www-test.
Integration is **not** permission to unlock Access. Real Portal staging E2E, link
review and explicit user approval must precede unlock.

WordPress remains REST publish state → content-only automation branch
`automation/wordpress-news/staging` → verified Draft PR against content/staging →
human review. No Ready/merge/deploy automation. A verified own stale Draft may close
on no-change; other no-change paths do not create commits/refs/PRs. External images
remain safe HTTP(S) references, not mirrored bytes guaranteed by contentSha.

## Snapshot / shared sitemap / concurrent writers

FileMaker and WordPress reuse the existing composer with exact code + staging
content SHAs. Admin event-image loads monthly storage and sitemap from one bound
staging commit. No main/live sitemap input. Event changes retain News/Resident
blocks; News changes retain Event/Resident blocks. A joint generator test also runs
News then Admin event-image generation and proves the foreign families survive.

There is no global browser/workflow lock. Each writer uses fresh expected-parent/head
gates. Admin/Portal use non-force ref updates; FileMaker/WordPress leases target only
their automation branches. No force update of content/staging, stale retry, auto
rebase or silent adoption of newer content. Known limitation retained from #105:
GitHub PR merge gates only the head, not base atomically. FileMaker verifies exact
merge parents/tree and refs afterward and blocks deployment if a race intervenes;
this is not a claim of global locking or rollback. Cutover pause/reconciliation is
still required. Permission/dispatch failure after content save is explicitly partial
success, never a false deployment-success claim or automatic repeat write.

## Tests — no new integrated failures

Node 22.22.3 on Windows, CRLF checkout. Required targeted selection: **946/951 PASS**;
five failures are members of the pre-existing baseline list below. New integration
contract file: **7/7 PASS**, using exported real writer/deployment functions and
synthetic in-memory APIs; no real writes. Workflow/composition plus initial six
integration cases: 15/15 PASS. Final complete repository run after the added tests:
**1,109/1,115 PASS, 6 failures; not green.**

The unchanged exact-main temporary checkout was freshly rerun: **881/892 PASS,
11 failures**. Exact name comparison: no new failures. These six persist:

- `error snapshot occurs immediately after Insert from URL`
- `official Distillery D asset is byte-identical and self-contained`
- `committed Resident pages exactly match the deterministic production artifacts`
- `workflow_dispatch is the only trigger`
- `validate job has read-only contents permission`
- `write job has only required write permissions`

These five baseline failures no longer occur because source #105 replaces its old
workflow assertions and #104 replaces the optional deployment contract:

- `workflow dispatch only`
- `event json required`
- `validate-only contents read only`
- `sync-pr has only required write permissions`
- `docker workflow has optional expected SHA dispatch input`

No unrelated baseline fix or global EOL rewrite. One newly added sitemap test
initially supplied an invalid synthetic sitemap without the mandatory News overview;
the fixture was corrected to the existing contract, not the generator weakened.

## Local browser QA and WordPress mock QA

Browser-skill checks used the integrated code and synthetic data only. Local servers:
`tests/helpers/admin-browser-server.mjs` (8770) and existing
`tests/helpers/portal-browser-server.mjs` (8769). Do not deploy these helpers.
Mock injection precedes application scripts; external network is blocked by the
mock and CSP. Admin proxy discards Authorization; no real credentials used.

Admin PASS: explicit Staging selection, disabled Live, immutable branch field,
fixture Event/image-only controls, Residents/Media/Releases, Gallery load and
Navigation load, six disabled Resident Access actions, resident save + Actions403
partial-success status, concurrent-field conflict with reload instruction.

Portal PASS: staging mapping (www-test exercised by exported contract tests; local
UI uses explicit environment=staging), fresh login, profile/news edits, media PDF
upload, Releases editor, save and mocked dispatch, Actions403 after saved content,
media-success/foreign-write/JSON-failure partial-success status, branch query blocked.
Dual-SHA payload checked behaviorally by the integration test. No unexpected captured
console errors/warnings in either UI. Browser smoke is not real remote E2E.

WordPress fixtures/mock HTTP: preserved source/sanitizer/image guards, staging Draft
target, shared sitemap, content-only output/deletions, no-change/stale ownership and
no auto-deploy. No WORDPRESS_BASE_URL production request.

## CI / container safety

The existing Staging container smoke workflow runs on the integration PR's exact
head, not an individual source branch. It tests composition/deployment/cross-writer
contracts, composes content/staging, builds staging and DEFAULT safety images locally,
runs nginx -t, HTTP/noindex/robots/sitemap404/recovery404 checks. Contents read only;
no registry login/publish or SSH. CI result is pending at Draft creation and must be
recorded from the actual PR run before calling this gate passed.

## External blockers and exact cutover preconditions

1. Coordinated review/explicit authorization to activate this stack; no independent
   source merges or auto-merge. Resolve known baseline failures separately or obtain
   an explicit acceptance; the full suite is not represented as green.
2. Fresh main/staging/live and content reconciliation again at the actual cutover;
   pause/control legacy FileMaker, browser and WordPress writers during the window.
3. Steffen's external FileMaker/MBS request must explicitly send environment=staging;
   authorize and complete real staging upsert/remove and cross-writer concurrency E2E.
4. Approve and provision browser token scopes. **Portal Actions write is unapproved**;
   do not infer authorization from the implemented dispatch code. Verify permission
   failures/partial-success handling in separately authorized remote tests.
5. Real Admin/Portal staging save/media/reload and conflict tests; Resident Access
   stays locked until Portal E2E, branch-free link review and explicit unlock approval.
6. Accept the single existing WordPress published REST source and human Draft-review
   flow. Later merge exact reviewed head, verify staging merge SHA and current main,
   then separately dispatch expected_sha + expected_content_sha; never single-SHA.
7. Phillip must confirm the actual forced-command implementation. Repo path:
   `/usr/local/sbin/deploy-www-test-distillery.sh`. Actual script contents, selected
   tag/digest, exact digest binding and rollback procedure remain **unknown** and are
   external blockers. No SSH or inference about server implementation was performed.
8. Obtain passing integrated container CI and a coordinated cutover window, rollback
   plan and operator acceptance. No live publication is activated by this package.

NO DEPLOYMENT PERFORMED. Stop after this integration review deliverable.

## Changed-file inventory versus main

+- `.github/workflows/docker-publish.yml`
- `.github/workflows/filemaker-event-intake.yml`
- `.github/workflows/staging-container-smoke.yml`
- `.github/workflows/wordpress-news-sync.yml`
- `docs/ADMIN_STAGING_WRITERS.md`
- `docs/COMPOSED_STAGING_DEPLOYMENT.md`
- `docs/RESIDENT_PORTAL_STAGING_WRITER.md`
- `docs/STAGING_CUTOVER_INTEGRATION.md`
- `docs/WORDPRESS_STAGING_CONTENT_WRITER.md`
- `docs/filemaker/STAGING_CONTENT_WRITER.md`
- `public/admin/extensions/resident-access.js`
- `public/admin/github-sync.js`
- `public/admin/index.html`
- `public/admin/js/admin-app.js`
- `public/admin/js/admin-draft-guard.js`
- `public/admin/js/admin-save-preflight.js`
- `public/admin/js/admin-v2-current-fixes.js`
- `public/admin/js/admin-write-baseline.js`
- `public/admin/js/auto-github-load.js`
- `public/admin/js/core/github-atomic-commit.js`
- `public/admin/js/core/resident-fresh-patch.js`
- `public/admin/js/core/staging-contract.js`
- `public/admin/js/core/staging-operation.js`
- `public/admin/js/events-meta.js`
- `public/admin/js/features/gallery/gallery.js`
- `public/admin/js/features/residents/residents-news-csv-import.js`
- `public/admin/js/features/site-navigation/site-navigation.js`
- `public/admin/js/github-media.js`
- `public/admin/js/residents-media.js`
- `public/admin/js/residents-news.js`
- `public/admin/js/staging-admin.js`
- `public/resident-portal/index.html`
- `public/resident-portal/js/app-coverfix.js`
- `public/resident-portal/js/core/config.js`
- `public/resident-portal/js/core/editor-operation.js`
- `public/resident-portal/js/core/environment.js`
- `public/resident-portal/js/core/git-transport.js`
- `public/resident-portal/js/core/github.js`
- `public/resident-portal/js/core/media-scope.js`
- `public/resident-portal/js/core/portal-session.js`
- `public/resident-portal/js/core/resident-patch.js`
- `public/resident-portal/js/core/upload.js`
- `public/resident-portal/js/modules/auth.js`
- `public/resident-portal/js/modules/media.js`
- `public/resident-portal/js/modules/news.js`
- `public/resident-portal/js/modules/releases.js`
- `public/resident-portal/js/modules/save.js`
- `scripts/content/deployment-binding.mjs`
- `scripts/content/deployment-report.mjs`
- `scripts/content/prepare-deployment-report.mjs`
- `scripts/content/prepare-staging-deployment.mjs`
- `scripts/content/staging-deployment-e2e.mjs`
- `scripts/content/verify-staging-deployment.mjs`
- `scripts/filemaker/filemaker-event-intake.mjs`
- `scripts/filemaker/prepare-filemaker-event.mjs`
- `scripts/filemaker/run-staging-writer.mjs`
- `scripts/filemaker/staging-commit.mjs`
- `scripts/filemaker/staging-contract.mjs`
- `scripts/filemaker/staging-github.mjs`
- `scripts/filemaker/staging-workspace.mjs`
- `scripts/filemaker/staging-writer.mjs`
- `scripts/news/news-sync.mjs`
- `scripts/news/prepare-sync.mjs`
- `scripts/news/staging-content.mjs`
- `scripts/news/staging-contract.mjs`
- `scripts/news/staging-pr.mjs`
- `scripts/news/staging-publish.mjs`
- `scripts/news/staging-sync.mjs`
- `tests/admin-event-image-only-ui.test.mjs`
- `tests/admin-staging-operation.test.mjs`
- `tests/admin-staging-residents.test.mjs`
- `tests/admin-staging-ui.test.mjs`
- `tests/content-deployment-cli.test.mjs`
- `tests/content-deployment-e2e.test.mjs`
- `tests/content-deployment-workflow.test.mjs`
- `tests/content-deployment.test.mjs`
- `tests/filemaker-event-intake.test.mjs`
- `tests/filemaker-staging-adapter.test.mjs`
- `tests/filemaker-staging-workspace.test.mjs`
- `tests/filemaker-staging-writer.test.mjs`
- `tests/gallery.test.mjs`
- `tests/helpers/admin-browser-mock.js`
- `tests/helpers/admin-browser-server.mjs`
- `tests/helpers/admin-staging-github.mjs`
- `tests/helpers/portal-browser-mock.mjs`
- `tests/helpers/portal-browser-server.mjs`
- `tests/helpers/portal-github-fixture.mjs`
- `tests/resident-portal-staging.test.mjs`
- `tests/staging-cutover-integration.test.mjs`
- `tests/wordpress-news-sync.test.mjs`
- `tests/wordpress-staging-content.test.mjs`
- `tests/wordpress-staging-pr.test.mjs`
