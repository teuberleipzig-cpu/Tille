# B1c-2 — prepared staging deployment cutover

> **DO NOT MERGE UNTIL STAGING WRITERS ARE READY FOR CUTOVER.**
> Active staging writers are not yet bound to content/staging.

This is a reviewable preparation, not authorization to merge, publish an image,
dispatch docker-publish, SSH to the server or change www-test. Only the PR's
non-publishing container smoke and mocked contract tests run in this package.

## Revision binding and workflow order

The future docker-publish workflow checks out the exact `github.sha`, with full
history, on `refs/heads/main`. Node 22 fetches content/staging once and captures
its exact commit once. No later step rereads its moving ref. The existing staging
composer validates both commits and produces an isolated RUNNER_TEMP/composed-site
context. Its report is checked against environment, code SHA, content SHA, ref,
artifact ID and valid=true before Buildx, registry login or image push.

The report and SHA-256 probes stay outside the public context. Build and deploy
job outputs pass the same code SHA, content SHA, artifact ID, digest and probes.
The deploy job checks out the bound code SHA to execute that revision's verifier.
There is no main-only build fallback, alternate deployment strategy or automatic
rollback after any failure.

## Dispatch contract (intentional compatibility break)

Both lowercase 40-hex commit inputs are mandatory:

- `expected_sha`: expected **CODE SHA**; the established input name is retained.
- `expected_content_sha`: expected **content/staging SHA**; no free branch input.

Dispatch must target main. Missing/malformed inputs, wrong checkout SHA or a
captured staging HEAD different from expected_content_sha fail before build.
Previously expected_sha was optional, explicitly asserted by an existing test.
That test is updated for this migration, not silently removed. Existing FileMaker
dispatches supplying only expected_sha are intentionally incompatible with the
prepared contract and MUST be migrated before cutover. No writer is changed here.

For push on main, code SHA is github.sha; content SHA is the one captured at job
start. For dispatch, github.sha must also equal expected_sha. A queued dispatch
whose expected content ref has moved fails rather than falling back to newer or
older content. Once captured, composition/tagging/reporting all use that revision.

## Legacy main-content gate

Push events are inspected using their exact before/after commits, not HEAD^.
Full ancestry must be available and before must be an ancestor of after; forced,
initial/deleted pushes, missing commits or unreliable baselines fail closed.
The endpoint tree diff includes merge/multi-commit pushes and disables rename
detection so both deleted and added paths are checked. Net-reverted changes do
not change the endpoint tree. No path-filter skips bypass the gate.

Classification uses CONTENT_MANIFEST and the existing replacement scope; there
is no independent content path list. MUTABLE/GENERATED changes, and excluded
files inside fully content-owned namespaces, fail with:

`Legacy content write on main detected; writer must use content/staging.`

Code-only pushes proceed. Noncanonical/ambiguous paths fail closed. Dispatch
does not use this diff gate: its explicit revisions are the approved inputs.

## Image identity and external deployment limit

Registry image remains ghcr.io/teuberleipzig-cpu/tille. Tags:

- Composer artifact ID: `staging-code-<40hex>-content-<40hex>`.
- `latest` = **legacy staging compatibility only**, never a future Live alias.
- `sha-<40hex>` = legacy code-SHA alias, retained for compatibility; not a unique
  content identity when the same code is rebuilt with a different content SHA.

The Buildx registry digest must match sha256 plus 64 lowercase hex digits. It is
recorded with environment/code/content/artifact and passed to deploy. A report
does not make an alias immutable; the digest is the precise registry identity.

Existing SSH configuration stays unchanged:

- Host: vps03.itlej.de
- User: deploy-www-test-distillery
- Forced-command script per repository comment:
  /usr/local/sbin/deploy-www-test-distillery.sh

The actual server script is not in this repository. **Exact server-side digest
binding is unknown until Phillip confirms it.** Passing the digest between jobs
does not prove the server pulls it. No new server command/argument is invented.

## Prepared post-reload verification

Before build, SHA-256 is computed from composed index.html (code probe) and
public/events/data/manifest.json (content probe). After successful SSH reload,
the verifier reads those exact paths on https://www-test.distillery.de with a
run-ID/run-attempt/retry query parameter, rejects redirects, and requires both
hashes to match. Six attempts maximum, ten-second retry delays and ten-second
request timeouts; the deploy job also has a fifteen-minute bound.

Additional mandatory HTTP checks: healthz 200, noindex/nofollow/noarchive headers,
robots User-agent * and Disallow / (no Allow), sitemap 404, manifest 200/no-store,
two known resident recovery/backup URLs 404, docker/nginx.conf 404 and
robots.staging.txt 404. Response bodies and transport errors are never logged.
All failures remain workflow failures. Unit tests use injected fetch mocks and
do not contact www-test.

Matching two probes proves those two expected files are visible, not the identity
of every file or the actual running image digest. Identical probes across two
revisions cannot distinguish those revisions. This is not server introspection
and makes no assumptions about CDN/proxy behaviour.

## Concurrency and rollback boundary

Keep the existing workflow-wide group `docker-publish` across build, alias push,
SSH and verification, but set cancel-in-progress=false. A newer run must not
interrupt an in-flight forced-command reload. GitHub pending-run scheduling is
not promised FIFO; operators must not assume every queued revision deploys.
Timeout/manual cancellation remains an operator risk, not an automatic rollback.

If verification fails after image publication or reload, the workflow reports
failure but cannot undo the external server operation. Rollback requires separate
operator authorization and coordination with the server owner.

## Hard merge/cutover preconditions

1. Review and approve this PR and its green PR smoke; retain Draft until approval.
2. Prepare/review all active FileMaker, Admin, Resident Portal, Gallery, Navigation
   and WordPress writers to use content/staging and dispatch with BOTH exact SHAs.
   Disable/quiesce any writer not ready through a separately approved operation.
3. Reconcile and explicitly approve a fresh staging content snapshot; the old seed
   is not automatically authoritative for later main-only writes. No catch-up or
   production cleanup is performed here.
4. Coordinate activation so no writer can keep writing only main/free branches
   while the new deployment reads exclusively content/staging. Contentbranches
   contain no workflow files and do not directly trigger this workflow.
5. Have Phillip confirm the external pull/reload behaviour, the staging-only tag
   policy, digest-binding limitation and the operator rollback procedure.
6. Obtain explicit user authorization for coordinated merge/cutover and the first
   real deployment/E2E run. A green smoke is not deployment authorization.

Live is out of scope: no content/live input, live image, live tag, live publish or
live deployment. No writer migration is included in this PR.
