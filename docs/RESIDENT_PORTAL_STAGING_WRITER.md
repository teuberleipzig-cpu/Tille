# Resident Portal staging writer (B1d-3)

⚠️ DO NOT MERGE YET

This is preparation for a coordinated cutover, not activation. PR #104 (composed
deployment) and PR #106 (Admin staging writers / locked Resident Access) remain
separate dependencies. PR #105 (FileMaker staging writer) remains separate too.
No production content, Admin files, FileMaker, WordPress, or workflow changes.

## Baseline and active graph

- Code/main: `4e723ca23465419b7db53408de5b7e9b05757fdd`
- Content/staging: `c96843b1ea447d19f2b93ed9aad4e18637e75edc`
- Content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`
- Feature branch: `codex/resident-portal-staging-writer`

`public/resident-portal/index.html` loads **only** `js/app-coverfix.js`.
Its active tab graph is `modules/auth.js`, `profile.js`, `links.js`, `news.js`,
`media.js`, `releases.js`, `save.js`; common leaves are `core/dom.js`, `state.js`,
and `image-processing.js`. Writers route through `core/github.js` and
`core/upload.js` into the new Portal-only helpers:

- `environment.js` / `config.js`: host and immutable selector configuration.
- `resident-patch.js`: identity, fresh login, field-intent patch, draft namespace.
- `portal-session.js`: private token-bound session, baselines and commit parent.
- `git-transport.js`: snapshot reads, atomic Git Data commits, dual-SHA dispatch.
- `media-scope.js`: resident media path validation.
- `editor-operation.js`: serial UI operation lock without DOM reconstruction.

Historical `app.js`, `portal*.js`, `modules/media-paths.js` are **not** reachable
from this graph and are not migrated. The graph test guards this distinction.
No code was copied from PR #106; a possible future shared patch/transport owner
requires a separate integration review. Active modified imports and the entry
script use cache version `staging-writer-1`; unchanged leaves keep their URLs.

## Environment and link contract

| Host | Environment / content ref | Publishing |
| --- | --- | --- |
| `www-test.distillery.de` | staging / `content/staging` | bound staging writer |
| `www.distillery.de` | live / `content/live` | blocked |
| `localhost`, `127.0.0.1` | staging only with explicit `?environment=staging` | local tests |
| Any other host | none | fail closed |

There is no main/default route. Any `branch` parameter, including empty or
`content/staging`, fails closed. `environment` overrides on public hosts fail
closed. Live reports **Live Resident Portal publishing is not activated yet.**
and never opens the publishing editor, uploads, deletes or dispatches.

Example public link (no branch):
`https://www-test.distillery.de/public/resident-portal/index.html?resident=<id>&invite=<invite-id>`.
ID-only and invite-only selectors remain supported. If both are supplied, both
must match the same unique resident; an invalid invite cannot fall back to ID.

## Login and immutable session

The initial public preload uses the served residents JSON; the future composed
staging deployment must serve the staging dataset. After token entry, the writer
reads `content/staging` HEAD and loads JSON at that **full commit SHA**, including
blob fallback from that snapshot. It checks identity, `enabled === true`, and
the freshly read code. Changed portal/access metadata since preload aborts login.
The editor opens only afterwards. No token means no GitHub request or mutation.

The session privately captures token, environment, ref, stable ID and validated
invite. Neither URL nor token input is reread for later writes. Content SHA is
advanced only after a verified own ref update. Parallel operations fail closed;
the existing editor is inert during async saves/media conversion and upload.

## Patch, baseline and conflict rules

Keep raw login baseline and a separate normalized form baseline. Only changed
allowlisted form fields are applied to the freshly read resident. Merely rendering
or reading an absent/default/legacy field does not cause it to be persisted.
The original `id`, `portal`, access metadata, unknown resident fields and every
other resident are preserved; other residents retain content and array order.
JSON whitespace is serialized as before; no claim of byte-identical formatting
for the complete JSON file is made.

Arrays are atomic field intents, not an attempt at concurrent element merging.
News sorting retains unknown news properties. Existing release and track objects
retain unknown properties, including when unchanged tracks are moved. Release
rendering uses a view rather than normalizing the stored record in place.

Same-field changes relative to the raw baseline conflict. In addition the session
is deliberately conservative: **any foreign staging commit requires reload**,
even if it touched unrelated content. This includes the interval between media
and JSON commits. There is no stale retry/rebase. A failed write invalidates the
session for subsequent writes. Locally edited state remains available as a draft.

## Atomic writes and media chain

JSON save changes only `public/residents/data/residents.json`. Reads are pinned
to the expected session parent. A Git blob/tree/commit is constructed with exactly
one scoped tree entry and one expected parent. Check staging head before building,
immediately before updating the ref, and after updating. Ref update is non-force;
a race cannot silently replace a foreign descendant. Uncertain ref outcomes name
the prepared commit and require reload; do not automatically retry or clean up.

Media write scope is exclusively:

- `public/residents/media/<resident-slug>/photos/*.jpg`
- `public/residents/media/<resident-slug>/presskit/*.(pdf|zip)`
- `public/residents/media/<resident-slug>/releases/*.jpg`

No traversal, backslashes, encoding tricks, external URLs, foreign residents,
HTML/JS/SVG or arbitrary extensions. Slug collisions with other residents fail.
Existing JPEG conversion remains. JSON stores paths, never new Data-/Blob-URLs.
Delete checks the exact file at the fresh pinned snapshot; an already absent file
can be a no-op, with another head check. No freely routed Contents PUT/DELETE.

Example: upload A advances the session parent to A; JSON save B must use A as its
parent. Cover uploads use the identical chain. A foreign commit between A and B
aborts B. Media writes prepare the dual-SHA deployment contract but do **not**
dispatch while the JSON reference is still pending. Final Save dispatches after
JSON consistency; it can also finish a media-only mutation without rewriting
identical JSON.

If media succeeds but JSON fails, status explicitly says:
“Medium wurde gespeichert, Resident-Daten konnten nicht gespeichert werden.
Bitte neu laden; keine automatische Bereinigung.” No deletion or rollback.
Media deployment-preparation failure similarly identifies the persisted medium.

## Drafts and UI ownership

Draft key: `residentPortalDraft:staging:<resident-id>`. Legacy keys are neither
deleted nor automatically restored/imported. Current session/local token storage
behavior is retained. No tokens are added to draft/content/URLs/logs.

Each tab retains its DOM ownership. News and release-detail rebuilds guard focused
editable elements; typing never reconstructs the editor. `editor-operation.js`
is the documented app-level exception owning only `#editorScreen.inert` during
save/media work. The app owns the build badge and global environment/status;
the existing shared `window.portalResidentState` is unchanged, not a new API.
No polling, interval, observer or automatic save is introduced.

## Deployment and capability boundary

After a successful content mutation, verify staging head equals the own commit,
read **fresh main**, then verify staging again. The prepared request is:

```json
{
  "ref": "main",
  "inputs": {
    "expected_sha": "<full fresh main SHA>",
    "expected_content_sha": "<full verified staging SHA>"
  }
}
```

Target: `docker-publish.yml`. No shortened SHA or single-SHA request. Dispatch
acceptance means **requested**, not deployment success. If main moves after the
read, PR #104 must reject the old expected code SHA. No retry with a new main SHA.

Content save and dispatch are separate results. An Actions 403/network failure
reports “Content gespeichert. Staging-Deployment konnte nicht gestartet werden.”
It keeps the content and issues neither rollback nor a second save.

**Cutover requires an explicit token permission decision.** A fine-grained token
with Contents Read/Write does not implicitly include Actions Write. Direct dispatch
requires that additional permission; this enlarges the resident token's capability
and must be consciously approved, or dispatch ownership redesigned separately.

`portal.code` and `portal.inviteId` are in publicly served JSON. They are selectors
and a UI hurdle, **not secret server credentials or GitHub authorization**. The
entered GitHub token is the real capability. Client-side resident/path guards
restrict this application's flow; they cannot restrict deliberate token use
outside the application. Do not place credentials in public resident data.

## Verification / local QA

Run `node --test tests/resident-portal-staging.test.mjs` for host, fresh login,
immutable context, patch, unknown fields, race/no-retry, media chain/scope,
dual-SHA/Actions failure, draft and active-import-graph coverage.

For local **mock only** UI QA:
`node tests/helpers/portal-browser-server.mjs`, then open
`http://127.0.0.1:8769/public/resident-portal/?environment=staging&resident=fixture-resident&invite=fixture-invite`.
Use `FIXTURE-CODE` and the deliberately invalid token
`TEST-ONLY-NOT-A-GITHUB-CREDENTIAL`. No real token is needed or permitted.
The server injects the mock before the real app starts; CSP blocks external fetch
connections. All GitHub calls use synthetic in-memory Git objects. Mock controls
exercise actual drop handlers with in-memory PDF/image fixtures, never repo media.
The helpers are not loaded by production HTML. Stop the server after QA.

Browser checks: missing token, wrong code, successful login and environment;
profile/links/news (focus, add/move/sort); media and release UI; mock presskit,
JPEG/photo and cover paths; draft; save; Actions 403; foreign-head conflict;
media-success/JSON-failure status; console and network isolation.

Implementation verification: 58/58 Portal tests passed. Full repository run:
939/950 passed, 11 failed. A separate temporary checkout of the exact unmodified
baseline reproduced the same 11 failures (881/892 passed). Nine concern existing
FileMaker/WordPress workflow or MBS-script formatting assertions (CRLF-sensitive);
the other two are `official Distillery D asset is byte-identical and self-contained`
and `committed Resident pages exactly match the deterministic production artifacts`.
They are not repaired in this Portal-only package. Do not describe the full suite
as green. Mock browser checks listed above passed with no console warnings/errors;
all GitHub writes and dispatches were intercepted, with no real credentials.

## Required before merge / activation

1. Review and jointly integrate PR #104 and #106; #105 stays a separate work item.
2. Reconcile **fresh** main/staging/live refs and content before coordinated cutover.
3. Confirm composed staging serves the intended resident JSON and portal build.
4. Explicitly decide/approve token Contents and additional Actions permissions.
5. Real Portal staging E2E: login, scoped media/save/delete, reload, and dual-SHA
   deployment with concurrent-write and permission-error cases. Not done here.
6. Review link generation; no free branch parameter and no live publishing.
7. Resident Access remains locked by PR #106 until joint integration, successful
   Portal staging E2E, link review and **explicit** unlock approval.
8. Live publication remains unactivated. No implicit live fallback.

This Draft does not unlock Admin Access, merge dependent PRs, run FileMaker,
dispatch a real workflow, deploy anything, or modify any content branch.
