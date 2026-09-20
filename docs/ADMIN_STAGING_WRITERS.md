# B1d-2 — Admin staging content writers

> ⚠️ DO NOT MERGE YET. This is a prepared cutover, not an activated deployment.

## Verified starting revisions

- Code/main: `4e723ca23465419b7db53408de5b7e9b05757fdd`
- content/staging: `c96843b1ea447d19f2b93ed9aad4e18637e75edc`
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`
- Branch: `codex/admin-staging-content-writers`

## Active entry points and ownership

The inventory follows script tags in `public/admin/index.html`, the dynamic
loaders in `events-meta.js` / `admin-v2-current-fixes.js`, and their imports.

| Active UI / entry | Staging writer / scope |
| --- | --- |
| Event image, top Save, legacy `saveEventsToGithub` | `auto-github-load.js` → existing image-only save plan → atomic event storage, exact event page, optional shared sitemap |
| Event image upload | `events-meta.js` → `github-media.js` → exact event media folder |
| Resident profile/list, top Save, legacy `saveResidentsToGithub` | `auto-github-load.js` → fresh three-way patch → only residents.json |
| Resident photos / presskit / photo delete | `residents-media.js` → bound media client → selected resident's validated folder |
| Release Save / cover | existing releases-core/workflow → same global Residents save / generic media client |
| Residents News CSV | `residents-news.js` loader → CSV import adapter → existing fresh dedupe save model → only residents.json |
| Gallery JSON / media | gallery feature → bound gallery client; existing JSON-first cleanup owner retained |
| Website navigation | site-navigation feature → only public/site/data/site-navigation.json |
| Resident Access | still loaded, deliberately read-only; no writer remains |

`github-sync.js` contains compatibility delegation only. All four active globals
are also bound directly by the staging adapter. No free-branch writer is retained
by an active button. Event CSV remains disabled by the existing FileMaker gate.
`core/github-client.js` is not imported by the active entry graph; it is intentionally
not refactored. `event-assets.js` remains a display-only resolver, not a writer.

## Browser boundary and operation context

`core/staging-contract.js` is a narrow browser projection of the central content
environment/manifest contracts. Tests compare allowed paths to those server rules;
the browser does not import Node-only content modules.

Only an explicit `staging` selection is accepted. Repository identity is fixed to
`teuberleipzig-cpu/Tille`. The compatibility `ghBranch` input is read-only and must
equal `content/staging`; tampering, missing values, main, live and arbitrary branches
fail closed. Live remains visible but disabled; programmatic live calls also fail.

`staging-admin.js` captures environment/ref/repository/token once, before any await.
`core/staging-operation.js` binds full 40-character main and content HEAD SHAs once.
All file reads, including blob fallback, belong to that immutable commit snapshot.
The UI names Staging/content/staging, and disables the environment selector during
requests. Later DOM edits cannot redirect an already captured operation.

Each writer has a narrower path scope than the overall content manifest. Traversal,
backslashes, code paths, another resident's media and another event page are rejected.
An event image save cannot become a free arbitrary-content writer.

## Fresh saves and conflicts

- Event image: fresh monthly storage and shared sitemap from one bound staging
  commit, stable event identity, only imageUrl patched. FileMaker/unknown fields are
  retained by the existing save planner. Storage + exact page + necessary sitemap
  are one Git Data commit, not independent Contents PUTs.
- Residents: raw loaded baseline, normalized view baseline and browser intent are
  compared against freshly read residents.json. Untouched fresh fields survive.
  Conflicting fields abort. Access keys are never patched. Arrays with concurrent
  changes or unrepresented unknown fields fail closed instead of losing data.
  Explicit create/delete/reorder remains supported; deletion requires the existing
  loss confirmation and unchanged target, while concurrent additions survive.
  Empty residents arrays and data/blob URLs are rejected. CSV retains fresh dedupe.
- Media: binary blob commits use the bound parent. Consecutive mutations within an
  operation advance to the returned commit; the UI records that parent for subsequent
  JSON Save or media operation. An intervening write requires reload, never a stale
  payload retry. Upload success followed by JSON failure is reported as partial
  success; no automatic orphan deletion is performed.
- Gallery: loaded JSON blob SHA must still match the fresh snapshot. JSON is saved
  before pending media deletions; cleanup failures retain their pending entries.
  Each successful cleanup advances the same operation parent. Source change clears
  loaded SHA, pending queue, selection and previews; none transfers to another source.
- Navigation: fresh blob conflict check and one atomic commit for its exact JSON path.

Atomic commits verify the expected parent, complete Git tree, head before ref update,
and `force:false`. The operation rechecks remote content HEAD after a successful ref
update. No retry with a replacement SHA, force push, rollback or main write exists.

Draft keys and diagnostic baseline keys include `staging-content-staging`. Old
unqualified browser drafts are neither automatically restored nor globally cleared.
Source changes invalidate JSON SHAs, resident patch baselines, CSV preview sessions,
gallery pending state and navigation loaded state.

## Prepared deployment / token gate

After a changed content commit: verify remote content/staging equals the returned
commit, read main freshly, then prepare/send `docker-publish.yml` dispatch with
`ref: main` and **both** `expected_sha` and `expected_content_sha` as full SHAs.
This code must not be activated before the composed deployment contract in PR #104.
A main race after binding is for that workflow's fail-closed gate; no silent retry.

Fine-grained Admin tokens need Contents read/write for content commits and additionally
Actions write for workflow dispatch. Existing Contents-only tokens must not be assumed
to have Actions permission. The UI token hint now states this requirement.

Content save and dispatch are distinct outcomes. A dispatch 403/error keeps the saved
content and explicitly says that the staging deployment could not start. No rollback,
automatic repeat write, or false claim of successful deployment. An unchanged operation
does not dispatch. Tokens and response payloads are not logged by the writer.

## TEMPORARY CUTOVER BLOCKER: Resident Access

**Resident Access Admin actions are disabled until Resident Portal migration.**

`public/admin/extensions/resident-access.js` remains loaded and displays a clear German
operator notice plus read-only presence/enabled status (not secrets). Access creation,
enable/disable, code regeneration, invite regeneration, link generation/copy and code
copy are disabled. The former normalization, link builder and autoSaveResidents path
have been removed from this module. Merely rendering it never changes resident data.

The unmodified Portal still defaults to main. Adding `branch=content/staging` to a
generated invite would falsely suggest a migrated Portal; therefore no such link is
created, no new environment parameter is invented and `public/resident-portal/**`
is untouched. Existing portal/invite/access and unknown access fields survive other
resident saves through fresh patching. Only a separately commissioned Resident Portal
migration with its own acceptance may remove this gate.

## Verification and acceptance boundary

- Functional in-memory GitHub API tests: fixed context, missing/live/ref rejection,
  scope parity, stale/blob conflicts, expected parent, non-force atomic updates,
  post-write head movement, fresh dual-SHA dispatch and permission failure.
- Functional resident patch tests: raw/view normalization, bio/city/social/media edits,
  protected and unknown access preservation, explicit collection edits and loss guards.
- DOM-harness tests: Access stays loaded, idempotent notice, six disabled controls,
  zero autoSave/network/clipboard calls and no generated branch link.
- Classic bridge/adapter tests: mutable DOM cannot redirect, pending-parent conflicts,
  environment reset, namespaced drafts, legacy delegation and resident save integration.
- Existing event image, monthly storage/atomic, resident CSV, gallery and navigation
  tests plus relevant content foundation/bootstrap/composition tests.
- Local browser smoke: unselected environment, disabled Live option, visible Access
  notice and disabled actions; no real token, content load/write/upload or dispatch.

These are implementation tests, **not** a remote cutover or real media roundtrip.
No production JSON, public website, Portal, FileMaker, WordPress or deployment workflow
is changed. Known unrelated CRLF tests are not repaired in this package.

Recorded result: **214/214** targeted Admin/storage tests passed. The four existing
`content-foundation`, `content-bootstrap`, `content-composition` and
`content-composition-workflow` test files also passed. Final resident/UI tests were
rerun after the URL-whitespace guard. Syntax, added timer/observer scan, secret-pattern
scan and `git diff --check` passed. Local browser showed no captured console errors;
an attempted local draft with no selected environment was visibly blocked.

## Preconditions before merge

1. Coordinated activation with PR #104 (composed staging deployment).
2. Active Admin token permissions for the selected deployment mechanism verified.
3. Fresh content/staging reconciliation; do not assume the starting snapshots remain current.
4. Remaining Resident Portal / WordPress writers ready or explicitly paused.
5. Coordinated cutover window; PR #105 stays a separate FileMaker writer change.

Keep this PR Draft, auto-merge off. No independent activation, real content save,
dispatch, deployment or follow-up package is authorized by this implementation.
