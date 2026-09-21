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

## 2. Human gates — all unapproved

Record approver, timestamp and evidence for each applicable gate. This document
does not grant approval and does not represent the full suite as green.

| Gate | Status / evidence needed |
| --- | --- |
| BASELINE_FAILURE_ACCEPTED | **NO** — explicit acceptance of the six named failures |
| STEFFEN_FILEMAKER_ENVIRONMENT_READY | **NO** — real MBS request prepared with explicit environment=staging |
| PHILLIP_SERVER_DEPLOY_CONFIRMED | **NO** — all eight server questions below answered |
| ADMIN_TOKEN_PERMISSIONS_VERIFIED | **NO** — Contents Read/Write + Actions Write confirmed without exposing token |
| PORTAL_ACTIONS_WRITE_APPROVED | **NO** — only needed if Option A is explicitly chosen |
| PORTAL_TOKEN_MODEL_CONFIRMED | **NO** — explicit A/B decision and operational responsibilities |
| MERGE_PUSH_DEPLOY_CONTROL_CONFIRMED | **NO** — automatic main-push deployment addressed before merge |
| CUTOVER_EXECUTION_APPROVED | **NO** — named operator, window, approved candidate head/CI and rollback evidence |

### Steffen

Confirm the actual FileMaker/MBS workflow_dispatch request to
`filemaker-event-intake.yml` sends `mode`, `operation`, **`environment=staging`**,
and `event_json`. Do not infer FileMaker layout/field names. No request now.

### Phillip — unanswered external questions

1. What is the actual content/behavior of `/usr/local/sbin/deploy-www-test-distillery.sh`?
2. Which image is pulled: `latest`, `sha-<code>`, `staging-code-<code>-content-<content>`,
   immutable digest, or another selector?
3. Is `docker pull` explicitly executed before reload?
4. How is the exact image/digest selected and bound to this deployment?
5. How is the last known working image restored?
6. Which container/Compose service serves www-test.distillery.de?
7. Can a staging reload affect any live service?
8. How is the previous state reliably restored after deployment failure?

The repository records intended artifact/digest but invokes the fixed external
script without passing that digest. Recording a digest is **not proof** that the
server selected it. No assumptions about this implementation or rollback commands.

### Portal and Admin permissions

Option A: Portal token Contents Read/Write + Actions Write; direct deployment
dispatch authorized only after explicit approval. Option B: **least privilege**,
Contents Read/Write only; content save succeeds but direct dispatch is unauthorized.
An internal operator/separately authorized mechanism performs the dual-SHA deploy.
Current Portal code still attempts dispatch and reports partial success if it is
denied; Option B is not an implemented “skip dispatch” switch. Do not repeat Save
to repair a dispatch failure. Record saved content SHA and hand off deployment.
If zero dispatch attempts are required, that needs a separately scoped code change.

Under approved Option B, PORTAL_ACTIONS_WRITE_APPROVED remains NO/not applicable;
PORTAL_TOKEN_MODEL_CONFIRMED must be YES. Do not silently approve A or grant scopes.
Admin's intended auto-deploy requires Contents Read/Write and Actions Write.
No token/secret values in logs, evidence or this runbook.

### Critical merge-trigger sequencing gate

Prepared `.github/workflows/docker-publish.yml` triggers on **push to main** as
well as workflow_dispatch. Merging #109 therefore can immediately publish and SSH
deploy; it does not wait for Phase C. Concurrency serializes runs but does not
prevent a second deployment. Do not proceed with the sequence below until an
explicit, independently authorized control prevents the merge-triggered deploy
and allows exactly one later dispatch. The operator must specify/verify that
control, its restoration and absence of queued/running automatic deployments.
Nothing is disabled in this task. If instead automatic push deployment is desired,
STOP and obtain a separately approved revised sequence; do not silently substitute
it for the requested dual-SHA manual first deployment.

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
reconciliation inventory/tree, gate approvals, previous server image/digest and
recovery instructions, merge SHA, dispatch time/run ID, artifact ID/digest,
code/content probe hashes, server identity, QA results and final refs.

END: only Phase F approval releases the freeze. Failure keeps it active pending
operator decision; no automatic timeout or retry. Separately authorized Phase E
tests are named, serialized exceptions: record each expected new content SHA,
finish its deploy/verification, then re-establish freeze before the next test.
Unexpected movement is always an abort, never an accepted new baseline.

## 4. Future execution — separate authorization required

The following is an operator checklist, **not executed by this documentation task**.
Do not run mutating steps while any applicable gate is NO.

### Phase A — Freeze and exact readiness

1. Confirm START acknowledgments and merge-trigger control above.
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
5. Verify successful container CI on the exact approved candidate, no new test
   failures, accepted baseline, all applicable human gates YES. No rebase/catch-up.

### Phase B — Only PR #109

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

### Phase C — First composed staging deployment

10. Confirm merge-trigger suppression/control and no duplicate queued/running run.
    Restore dispatch availability only as explicitly approved. Fetch staging head:
    it must remain the frozen SHA. Recheck main equals recorded merge SHA.
11. Perform exactly one authorized dispatch, bound to both full SHAs:

    ```powershell
    gh workflow run docker-publish.yml --repo teuberleipzig-cpu/Tille --ref main -f expected_sha=$mergeSha -f expected_content_sha=$frozenContentSha
    ```

12. Record workflow **run ID** (not just workflow definition ID), dispatch timestamp,
    workflow_dispatch event, exact code head and bound content SHA. Disambiguate by
    run metadata and binding summary; do not take an unrelated latest run. Unknown
    dispatch outcome: inspect read-only, never dispatch a duplicate blindly.
13. Require build success, expected `staging-code-<code>-content-<content>` artifact
    ID, registry digest `sha256:...`, SSH reload success and integrated E2E success.
    Capture intended and Phillip-verified actual server image/digest separately.
    Compatibility tags latest/sha-code are not immutable evidence of selection.
    The verifier's existing bounded retries do not authorize an operator rerun.

### Phase D — Remote www-test QA (no writes)

14. Check `https://www-test.distillery.de/` and compare byte hashes with the exact
    composition report: code probe `index.html`, content probe
    `public/events/data/manifest.json`. They must match the bound artifact.
15. Verify healthz 200; X-Robots-Tag noindex,nofollow,noarchive; robots.txt
    `User-agent: *` + `Disallow: /` (no Allow); sitemap.xml 404; content JSON
    Cache-Control no-store. Require 404 for:
    `public/residents/data/residents-backup-before-restore.json`,
    `public/residents/data/recovery-note.txt`, `docker/nginx.conf`,
    `robots.staging.txt`. Do not print sensitive unexpected response bodies.
16. Admin and Portal load normally without saving. Capture QA evidence; any failed
    hash/safety/status check blocks unfreeze even if Actions reported success.

### Phase E — Separately authorized writer E2E

17. Keep general freeze; authorize each controlled exception explicitly:

    - FileMaker: validate-only, controlled upsert, remove/approved cleanup case.
    - Admin: minimal controlled save, reload, conflict test; no stale overwrite.
    - Portal: login, minimal save/reload; media only with explicit additional approval.
    - WordPress: validate-only against real source; sync-pr separately approved,
      then human Draft review/merge/separate deploy, never automatic activation.

18. Record intended change, before/after SHA, partial-success status, deployment and
    reload proof. No synthetic production data or ad hoc rollback. Access stays
    locked; tests do not authorize invite/code changes. Permission failure after
    save must not cause repeat content writes. Restore a known state by an approved
    forward correction only if necessary; content movement is recorded, not hidden.

### Phase F — Unfreeze

19. Release writers only after www-test E2E and all agreed writer E2Es pass, both
    deployment SHAs and current refs are understood, rollback is unnecessary, and
    the operator explicitly approves END. If E2Es are pending, keep the gate open.

## 5. Immediate abort conditions

STOP on unexpected main/content-staging/content-live movement, PR head/base drift,
non-mergeable PR, new test failure or non-green candidate CI, reconciliation diff,
unapproved baseline, Steffen not ready, unanswered Phillip gate, missing required
token capability, unchosen Portal model, unresolved merge-push trigger, unknown
writer during freeze, Docker build/registry push/SSH failure, code/content hash
mismatch, noindex failure, accessible recovery/config file or any failed QA gate.
Expected merge and individually approved writer commits are the only exceptions
and must match their recorded outcomes exactly. Preserve evidence; keep freeze;
report impact and required decision. No alternate strategy, force push or retry
loop. A concurrent base race is an abort even if GitHub accepted the head guard.

## 6. Rollback boundaries — server procedure not yet executable

Phillip must confirm actual server rollback and last-known-good immutable image
before cutover. Do not invent Docker/Compose commands. Never automatically revert
PR #109, reset a content branch, force-push or revert content to fix deployment.

- **A: image built, server unchanged.** Confirm server really unchanged, preserve
  working image and failed-run evidence; keep freeze. Operator decides whether a
  separately authorized corrected deployment is safe. A published tag is not proof
  the server changed; an SSH failure may still have partial effects and needs proof.
- **B: server reloaded, E2E failed.** Keep freeze, record actual container/digest,
  hashes and failure. Only Phillip's verified procedure and explicit operator
  approval may restore the last-known-good server artifact, followed by full QA.
  Main/content history remains intact; resolve code/artifact mismatch explicitly.
- **C: writers already wrote afterward.** Freeze again; capture all new content
  SHAs/operations. Operator assesses compatibility of old image with new content
  and whether an approved forward repair is safer. Do not discard saved content or
  replay stale payloads; no automatic fallback to an older content SHA.

## 7. Post-success cleanup and Resident Access

Only after successful #109 merge **and deployment/cutover**, separately authorize
closing #104, #105, #106, #107, #108 with **“Integrated via PR #109.”** Never merge
them additionally. None are closed/changed by this task; #12 remains untouched.

Resident Access stays **LOCKED even after the first technical cutover**. Unlock
requires real Portal staging E2E, confirmed branch-free resident/invite link
format, approved token model and explicit user approval in a separate task.

This readiness task ends with documentation. No cutover or follow-up starts itself.
