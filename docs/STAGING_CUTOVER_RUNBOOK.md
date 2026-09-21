# B1e-2 — Staging cutover runbook / readiness only

**NOT AUTHORIZED FOR EXECUTION. NOT READY. PR #109 remains Draft; auto-merge off.**
Prepared 2026-09-21. This document is a plan, not a merge/deployment approval.
No deployment, GHCR publish, SSH, real writer, content write or production-data
change was performed. No writer was disabled. No token was displayed or tested.
Only a separately authorized operator may execute the future phases below.

## 1. Verified readiness snapshot

| Ref | Exact SHA |
| --- | --- |
| origin/main / PR #109 base | `4e723ca23465419b7db53408de5b7e9b05757fdd` |
| origin/content/staging | `c96843b1ea447d19f2b93ed9aad4e18637e75edc` |
| origin/content/live | `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a` |
| PR #109 integration head / local and remote integration branch | `8621d730bc127ec31d5123683523aac3e4cfb033` |

Working tree was clean before documentation edits. PR #109 was OPEN, Draft,
MERGEABLE, base main, exact base/head above, autoMergeRequest null. It is the
**only cutover merge candidate** and integrates #104–#108. Do not additionally
merge those source PRs. This runbook's documentation commit advances the head:
the operator must explicitly approve and record the resulting exact candidate
head and its own successful CI before execution. Never silently adopt a new head.

Fresh read-only reconciliation PASS: main's projected content and content/staging
match in every path, Git mode, blob SHA and classification. Content tree:
`ec799d6d5eaec51d8633e99bf2e9d967e0f1279f`.
**1,821 files: 243 MUTABLE, 1,578 GENERATED; zero blob differences.**
content/live remains at the separately recorded SHA; it is not a staging target.

| Rule | Count | Rule | Count |
| --- | ---: | --- | ---: |
| event-months | 182 | event-meta | 1 |
| event-manifest | 1 | event-index | 1 |
| event-search | 1 | event-pages | 1568 |
| event-media | 5 | residents | 1 |
| resident-images | 52 | resident-presskits | 0 |
| resident-pages | 3 | news-legacy | 1 |
| news-overview | 1 | news-articles | 1 |
| gallery | 1 | gallery-media | 0 |
| navigation | 1 | sitemap | 1 |

Open PR inventory contained #109, #104–#108 and #12, all Draft against main;
no open legacy content PR. Recheck at the actual freeze; never repair drift here.

### Exact-head CI and baseline acceptance

[Run 35583800625](https://github.com/teuberleipzig-cpu/Tille/actions/runs/35583800625):
Staging container smoke test, pull_request, completed/success, exact head
`8621d730bc127ec31d5123683523aac3e4cfb033`. All steps successful. Local image
builds/container checks only: no registry publish, no SSH. This supersedes the
older intermediate-head run as evidence for the final integration baseline.
It does not certify later documentation heads or external server behavior.

Previously reproduced full suite: integration **1109/1115, six failures**;
fresh main baseline **881/892, eleven failures**. The six are a subset of that
baseline, not new integration failures. No full-suite rerun or test edit in this
documentation-only task. The exact remaining names are:

- `error snapshot occurs immediately after Insert from URL`
- `official Distillery D asset is byte-identical and self-contained`
- `committed Resident pages exactly match the deterministic production artifacts`
- `workflow_dispatch is the only trigger`
- `validate job has read-only contents permission`
- `write job has only required write permissions`

## 2. Human gates and confirmed decisions

Record approver, timestamp and evidence for each applicable gate. This document
does not grant approval and does not represent the full suite as green.

| Gate | Status / evidence needed |
| --- | --- |
| BASELINE_FAILURE_ACCEPTED | **YES, conditional** — the six named baseline failures are accepted only while no new failure is present at cutover |
| STEFFEN_FILEMAKER_ENVIRONMENT_READY | **YES** — Steffen confirmed explicit environment=staging is implemented |
| PHILLIP_SERVER_DEPLOY_CONFIRMED | **YES** — confirmed service, latest-image pull/up wrapper and Git-revert rollback |
| ADMIN_TOKEN_PERMISSIONS_VERIFIED | **NO** — Contents Read/Write + Actions Write confirmed without exposing token |
| PORTAL_ACTIONS_WRITE_APPROVED | **NO** — deliberate least-privilege decision |
| PORTAL_TOKEN_MODEL_CONFIRMED | **YES** — Option B selected; external authorized deployment after save |
| AUTOMATIC_PUSH_DEPLOY_READY | **NO** — automatic main-push run and frozen content binding operationally prepared |
| CUTOVER_EXECUTION_APPROVED | **NO** — named operator, window, approved candidate head/CI and rollback evidence |

### Steffen

Steffen confirmed the FileMaker/MBS workflow_dispatch request implements explicit
`environment=staging` for `filemaker-event-intake.yml`, alongside `mode`,
`operation` and `event_json`. This confirmation does not authorize a request and
does not permit assumptions about FileMaker layout/field names.

### Phillip — confirmed www-test deployment mechanism

www-test uses Compose service `www-test-distillery-web` and image
`ghcr.io/teuberleipzig-cpu/tille:latest`. The confirmed forced wrapper performs:

```text
docker compose pull www-test-distillery-web
docker compose up -d www-test-distillery-web
```

The first cutover does not require server-side digest or alternate-tag pinning.
The workflow publishes `latest`; the wrapper pulls it and recreates that service.
The recorded artifact ID and registry digest remain evidence for the build, but
the server selection contract is the confirmed `latest` tag. Rollback is a normal
Git revert of the PR #109 merge followed by the automatic main-push rebuild and
redeploy described below, not selection of a guessed historic image tag.

### Portal and Admin permissions

Option A: Portal token Contents Read/Write + Actions Write; direct deployment
dispatch authorized only after explicit approval. Option B: **least privilege**,
Contents Read/Write only; content save succeeds but direct dispatch is unauthorized.
An internal operator/separately authorized mechanism performs the dual-SHA deploy.
Current Portal code still attempts dispatch and reports partial success if it is
denied; Option B is not an implemented “skip dispatch” switch. Do not repeat Save
to repair a dispatch failure. Record saved content SHA and hand off deployment.
If zero dispatch attempts are required, that needs a separately scoped code change.

Under selected Option B, PORTAL_ACTIONS_WRITE_APPROVED remains NO/not applicable
and PORTAL_TOKEN_MODEL_CONFIRMED is YES. Do not grant Actions Write.
Admin's intended auto-deploy requires Contents Read/Write and Actions Write.
No token/secret values in logs, evidence or this runbook.

### Automatic first deployment and later dual-SHA dispatches

Prepared `.github/workflows/docker-publish.yml` triggers on **push to main** as
well as workflow_dispatch. Merging #109 therefore starts the first real staging
deployment automatically. The writer freeze must remain active from the final
content reconciliation through this push-triggered run, so its freshly resolved
content/staging SHA is exactly the approved frozen SHA.

Identify and verify this run by `event=push` and the exact PR #109 merge SHA. Do
**not** issue an additional manual workflow_dispatch for the first cutover: that
would be redundant and could cause a second deployment. If the automatic run does
not start, fails, or binds an unexpected SHA, stop and investigate; manual dispatch
is not a fallback.

workflow_dispatch remains required for later content-only changes from FileMaker,
Admin, Resident Portal, or an approved WordPress content PR. Those deployments
remain bound to `expected_sha=<current main SHA>` and
`expected_content_sha=<verified content/staging SHA>`.

### WordPress contract

Published WordPress REST state → content-only `automation/wordpress-news/staging`
branch → Draft PR against content/staging → human review → exact-head/SHA-gated
merge → separate dual-SHA deploymentdispatch. **No auto-deploy.** No real REST
request now. Human merge must verify resulting content merge/ref before deployment.

## 3. Freeze protocol and evidence record

START: operator agrees a short maintenance window with every writer owner and
receives acknowledgments before final reconciliation. Stop submissions from
FileMaker Event Intake, Admin Saves and Media Upload/Delete, Portal Saves and
Media, and WordPress News Sync. Confirm no in-flight/queued writer or older deploy
can complete during the window. Also coordinate code-main writers/merges.
Do not assume a UI banner is a lock. No technical disabling is authorized here.

Record: operator/window, acknowledgments, approved PR head/base/CI, all three refs,
reconciliation inventory/tree, gate approvals, current server state and confirmed
revert procedure, merge SHA, push-run start time/run ID, artifact ID/digest,
code/content probe hashes, server identity, QA results and final refs.

END: only Phase G1 approval releases the freeze. Failure keeps it active pending
operator decision; no automatic timeout or retry. Separately authorized Phase G1
tests are named, serialized exceptions: record each expected new content SHA,
finish its deploy/verification, then re-establish freeze before the next test.
Unexpected movement is always an abort, never an accepted new baseline.

## 4. Future execution — separate authorization required

The following is an operator checklist, **not executed by this documentation task**.
Do not run mutating steps while any applicable gate is NO.

### Phase A — Writer freeze

1. Confirm START acknowledgments and automatic push-deploy readiness above.

### Phase B — Fresh reconciliation and final tests

2. Fetch, then record main/content-staging/content-live and candidate head:

   ```powershell
   git fetch origin --prune
   git rev-parse origin/main origin/content/staging origin/content/live origin/codex/staging-cutover-integration
   gh pr view 109 --repo teuberleipzig-cpu/Tille --json state,isDraft,baseRefName,baseRefOid,headRefOid,mergeable,autoMergeRequest
   gh pr list --repo teuberleipzig-cpu/Tille --state open --limit 100 --json number,headRefName,baseRefName,isDraft
   ```

3. Require recorded base/content refs exactly match section 1; PR OPEN, base main,
   exact explicitly approved candidate head, MERGEABLE, auto-merge off. Initially
   Draft; Ready only after separate approval. No new legacy content PR/in-flight run.
4. Repeat read-only reconciliation with the existing APIs (no generation/writes):

   ```powershell
   @'
   import assert from 'node:assert/strict';
   import {planContentBootstrap,validateContentCommit} from './scripts/content/bootstrap-plan.mjs';
   const a=planContentBootstrap({environment:'staging',sourceSha:'4e723ca23465419b7db53408de5b7e9b05757fdd'});
   const b=validateContentCommit({environment:'staging',contentRef:'content/staging',contentSha:'c96843b1ea447d19f2b93ed9aad4e18637e75edc'});
   assert.deepEqual(a.files,b.files);
   assert.deepEqual(a.inventory,b.inventory);
   assert.equal(a.treeSha,'ec799d6d5eaec51d8633e99bf2e9d967e0f1279f');
   assert.equal(b.treeSha,a.treeSha);
   assert.equal(b.inventory.total,1821);
   assert.equal(b.inventory.mutable,243);
   assert.equal(b.inventory.generated,1578);
   console.log(JSON.stringify({inventory:b.inventory,tree:b.treeSha}));
   '@ | node --input-type=module
   ```

   Compare full rule distribution, 1821/243/1578 totals and exact tree above.
   Check command exit codes. Refs must still equal the approved snapshot.
5. Verify successful container CI on the exact approved candidate and repeat the
   final tests. The six accepted baseline failures may remain, but no new failure
   is allowed. Require all applicable human gates YES. No rebase/catch-up.

### Phase C — Exact-SHA merge

6. Separately authorized operator marks #109 Ready, then reloads PR data.
7. Recheck exact head/base and MERGEABLE; fetch/check main immediately before merge.
8. Merge with the explicitly recorded expected head, never an unchecked latest:

   ```powershell
   # $approvedHead must be the independently approved full 40-character SHA.
   gh pr merge 109 --repo teuberleipzig-cpu/Tille --merge --match-head-commit $approvedHead
   ```

   No --auto, --admin or branch deletion. GitHub's head guard does not atomically
   guard base: keep the freeze, then verify merge parents (approved base/head) and
   resulting refs. Any race stops the next phase; never automatically revert.
9. Record merge SHA from GitHub; verify PR CLOSED + merged, fetch origin and require
   main exactly equals that SHA. Record unchanged content/staging and content/live.

### Phase D — Automatic main-push deployment start

10. Identify the `docker-publish.yml` run automatically created by the main push.
    Require `event=push`, head SHA and bound code SHA equal the exact merge SHA, and
    bound content SHA equals the freshly verified frozen content/staging head.
    Disambiguate by run metadata and binding summary; do not take an unrelated run.
11. Do **not** manually dispatch a second first-cutover run. If the push run is
    absent, failed, or binds either wrong SHA, stop and analyze the cause. Never use
    workflow_dispatch as an automatic fallback or blindly retry the merge deploy.

### Phase E — Build, publish, wrapper reload

12. Require build success, expected `staging-code-<code>-content-<content>` artifact
    ID, registry digest `sha256:...`, SSH reload success and integrated E2E success.
    Confirm the wrapper pulled `ghcr.io/teuberleipzig-cpu/tille:latest` and recreated
    `www-test-distillery-web`; capture the workflow artifact/digest as build evidence.
    The verifier's existing bounded retries do not authorize an operator rerun.

### Later content-only staging deployments

After the first cutover, a separately authorized content-only change does not push
main. Fetch and verify both refs, then perform one dual-SHA dispatch:

```powershell
gh workflow run docker-publish.yml --repo teuberleipzig-cpu/Tille --ref main -f expected_sha=$currentMainSha -f expected_content_sha=$verifiedContentSha
```

Record the workflow run ID, workflow_dispatch event, exact current main SHA and
verified content/staging SHA. This applies to FileMaker, Admin, Resident Portal and
human-reviewed WordPress content changes; it is not a fallback for a failed first
push deployment.

### Phase F — Remote www-test E2E (no writes)

13. Check `https://www-test.distillery.de/` and compare byte hashes with the exact
    composition report: code probe `index.html`, content probe
    `public/events/data/manifest.json`. They must match the bound artifact.
14. Verify healthz 200; X-Robots-Tag noindex,nofollow,noarchive; robots.txt
    `User-agent: *` + `Disallow: /` (no Allow); sitemap.xml 404; content JSON
    Cache-Control no-store. Require 404 for:
    `public/residents/data/residents-backup-before-restore.json`,
    `public/residents/data/recovery-note.txt`, `docker/nginx.conf`,
    `robots.staging.txt`. Do not print sensitive unexpected response bodies.
15. Admin and Portal load normally without saving. Capture QA evidence; any failed
    hash/safety/status check blocks unfreeze even if Actions reported success.

### Phase G1 — PASS: separately authorized writer E2E and controlled unfreeze

16. Keep general freeze; authorize each controlled exception explicitly:

    - FileMaker: validate-only, controlled upsert, remove/approved cleanup case.
    - Admin: minimal controlled save, reload, conflict test; no stale overwrite.
    - Portal: login, minimal save/reload; media only with explicit additional approval.
    - WordPress: validate-only against real source; sync-pr separately approved,
      then human Draft review/merge/separate deploy, never automatic activation.

17. Record intended change, before/after SHA, partial-success status, deployment and
    reload proof. No synthetic production data or ad hoc rollback. Access stays
    locked; tests do not authorize invite/code changes. Permission failure after
    save must not cause repeat content writes. Restore a known state by an approved
    forward correction only if necessary; content movement is recorded, not hidden.

18. Release writers only after www-test E2E and all agreed writer E2Es pass, both
    deployment SHAs and current refs are understood, rollback is unnecessary, and
    the operator explicitly approves END. If E2Es are pending, keep the gate open.

### Phase G2 — FAIL: keep freeze and assess controlled Git revert

If Phase D, E or F fails, do not dispatch a manual fallback and do not automatically
revert. Keep the freeze, determine whether the server changed, and follow section 6.
If the new version is served and return is required, an operator may approve the
controlled merge-revert → automatic main-push rebuild/redeploy → full rollback-E2E.

## 5. Immediate abort conditions

STOP on unexpected main/content-staging/content-live movement, PR head/base drift,
non-mergeable PR, any failure beyond the accepted six or non-green candidate CI,
reconciliation diff, revoked Steffen/Phillip confirmation, missing required token
capability, unprepared automatic push deployment, unknown
writer during freeze, Docker build/registry push/SSH failure, code/content hash
mismatch, noindex failure, accessible recovery/config file or any failed QA gate.
Expected merge and individually approved writer commits are the only exceptions
and must match their recorded outcomes exactly. Preserve evidence; keep freeze;
report impact and required decision. No alternate strategy, force push or retry
loop. A concurrent base race is an abort even if GitHub accepted the head guard.

## 6. Controlled Git-revert rollback for the first cutover

The first-cutover rollback restores code through Git, not through a main reset,
force-push, content/staging reset, assumed old digest or guessed image tag. A failed
cutover does **not** automatically trigger a revert. Keep the writer freeze active
and first establish whether the build failed before server change, SSH/reload failed,
the new version is actually served, or only an E2E check failed.

- **Server unchanged:** preserve evidence and do not create an unnecessary revert.
  The operator diagnoses the failure and separately decides the next action.
- **New version served and return required:** capture and inspect the actual PR #109
  merge commit, then create an operator-controlled normal revert, conceptually:

  ```powershell
  git revert -m 1 <PR109_MERGE_SHA>
  ```

  `<PR109_MERGE_SHA>` is captured only during the real cutover; it is not known or
  hard-coded in advance. Verify the commit before reverting. Bring the revert to
  main as a normal new commit under operator control. Its main push automatically
  runs `docker-publish.yml`, rebuilds `ghcr.io/teuberleipzig-cpu/tille:latest`, and
  the confirmed wrapper pulls latest and recreates `www-test-distillery-web`.
  Run the complete www-test E2E again. No automatic revert or manual deployment
  dispatch fallback is permitted.

This contract is safe for the **first cutover** because the writer freeze keeps
content/staging unchanged throughout cutover and rollback:

```text
before:   old code      + Content A
cutover:  new code      + Content A
rollback: reverted code + Content A
```

If any later legitimate FileMaker, Admin, Resident Portal or WordPress write has
moved content/staging, a code revert alone is not automatically a complete website
rollback. Freeze again and evaluate code state plus content state separately. Do
not invent a content-branch rollback, discard content, replay stale payloads or
force-push. A separate operator decision and plan are required.

## 7. Post-success cleanup and Resident Access

Only after successful #109 merge **and deployment/cutover**, separately authorize
closing #104, #105, #106, #107, #108 with **“Integrated via PR #109.”** Never merge
them additionally. None are closed/changed by this task; #12 remains untouched.

Resident Access stays **LOCKED even after the first technical cutover**. Unlock
requires real Portal staging E2E, confirmed branch-free resident/invite link
format, approved token model and explicit user approval in a separate task.

This readiness task ends with documentation. No cutover or follow-up starts itself.
