# B1d-1 — FileMaker staging content writer (not activated)

> ⚠️ DO NOT MERGE YET
>
> DO NOT MERGE UNTIL STEFFEN'S FILEMAKER REQUEST SENDS environment=staging
>
> Depends on coordinated activation with PR #104.

This change is preparation, not an authorization to run FileMaker or deploy.
The existing deployment workflow on main does not yet accept the full contract.
There is deliberately no main-only compatibility fallback.

## Steffen handoff: future request contract

Workflow: `filemaker-event-intake.yml`, dispatch ref: `main`.

| Input | Required value/meaning |
| --- | --- |
| `mode` | `validate-only` or `sync-pr` |
| `operation` | `upsert` or `remove` |
| `environment` | Explicitly `staging`; no default |
| `event_json` | Existing V1 payload, serialized as a string; unchanged field contract |

The external FileMaker/MBS request must add **`environment=staging`** to its
workflow inputs before activation. Existing requests without that input become
invalid. No FileMaker field/layout changes are prescribed here. Existing V1 ID,
omitted-field, image, sections and remove semantics remain unchanged. Dates,
tags, timetable and V2 are not part of this change.

`live` is reserved in the central environment contract, but both `sync-pr` and
`validate-only` reject it with:
`Live FileMaker publishing is not activated yet.`
Neither a missing nor invalid environment falls back to staging, live or main.

## Ownership and execution

1. Checkout the exact workflow `github.sha`; accept only workflow_dispatch on
   `refs/heads/main`, with matching `GITHUB_WORKFLOW_SHA`, checkout SHA and current
   remote main. Bind code SHA and remote `content/staging` SHA once.
2. Fetch the bound content object, never check out the content branch as code.
   Reuse `composeSite` in an isolated empty `RUNNER_TEMP` directory. All content,
   including the shared sitemap, comes from that single content snapshot.
3. Run the existing V1 generator against this workspace. Inventory the complete
   workspace before/after to reject unreported writes. Retain its operation-
   specific storage/page/sitemap allowlist and add the central content-scope gate.
4. For actual changes only, create a content-only Git tree from the validated
   content base, replacing/deleting precisely the generated outputs. All other
   blobs remain byte-identical. `commit-tree` creates a commit with exactly one
   parent: the bound content SHA. No checkout, index or working-tree writes.
5. Push only `automation/filemaker-event/staging/<validated-fm-id>` with an exact
   expected remote-head lease. Create/update a Draft PR with base `content/staging`.
   Reject multiple relevant PRs or another event's open staging FileMaker PR.
6. Before push, Ready and merge, check both main and content/staging afresh.
   Before Ready and merge, check PR number/open state, same repository, exact
   head/base names and SHAs, environment/event identity, complete paginated files,
   rename sources, both scope gates and the locally verified content-only commit.
   No GitHub auto-merge setting is enabled. Merge only via REST with exact head SHA.
7. Fetch the exact merge object without writing a ref; verify its parents are
   precisely the bound content base and automation head, and its tree equals the
   generated content tree. Verify current main is still the code SHA and staging HEAD equals the returned
   content merge SHA. Only then request the future composed staging deployment:

   ```text
   gh workflow run docker-publish.yml --ref main \
     -f expected_sha=<bound-code-sha> \
     -f expected_content_sha=<verified-content-merge-sha>
   ```

   The content input is the **merge commit**, not the automation head, a branch,
   or `latest`. A failed/stale gate aborts; no stale retry or new-code fallback.

Allowed writes remain only `public/events/data/{manifest,meta,event-index,search-index}.json`,
`public/events/data/months/YYYY-MM.json`, the exact affected `events/<id>/index.html`
and `sitemap.xml`. Media and all other content families remain outside FileMaker's
write scope. News/resident sitemap entries are preserved from staging, not main.

`validate-only` composes and checks the operation without applying generated
outputs, creating commits/branches, querying/mutating PRs, merging or dispatching.
No-change performs no mutation, including no stale-PR close; any same-event stale
PR number is reported for separately controlled cleanup. No empty commits.

The global `filemaker-event-intake` concurrency group and `cancel-in-progress: false`
remain in place. This serializes FileMaker runs, not other writers; independent
SHA gates remain essential. An external writer racing the final check cannot be
locked by GitHub's head-SHA-only merge API; coordinated cutover and fresh
reconciliation remain required. Failures after a successful merge but before
dispatch require operator reconciliation, not automatic retry.

## Module boundaries and tests

- `staging-contract.mjs`: central environment/revision binding, scope and PR gates.
- `staging-workspace.mjs`: reuse composer and existing V1 generator, full inventory.
- `staging-commit.mjs`: content-only objects, exact parent and diff verification.
- `staging-writer.mjs`: tested side-effect sequence with injectable boundaries.
- `staging-github.mjs`: git/gh adapter, explicit lease and two-SHA dispatch.
- `run-staging-writer.mjs`: guarded workflow entrypoint; no payload logging.

`prepare-filemaker-event.mjs` remains a local generator CLI, not a remote writer;
the obsolete main-only PR planner/branch output has been removed. Workflow
routing assertions migrate to executable mocked sequence tests, while existing
V1 model, storage and SEO tests remain. All writer tests use synthetic temporary
repositories/mocks; they never write production content or dispatch FileMaker.

Run FileMaker intake, monthly storage, event SEO, `filemaker-staging*.test.mjs`,
content foundation, bootstrap and composition tests. New tests are CRLF-robust.
Do not repair unrelated Windows CRLF assertions in this package.

## Mandatory activation gates (separate authorized operation)

- Steffen's real request explicitly sends `environment=staging`.
- Coordinate with PR #104; do not copy its code or change docker-publish here.
- After integrating PR #104, resolve/retest contract compatibility and any
  `tests/filemaker-event-intake.test.mjs` overlap; no premature conflict duplication.
- Reconcile content/staging afresh against legitimate changes since bootstrap.
- Keep FileMaker calls paused during the small activation window unless explicitly
  coordinated. No run may observe the writer/deployment contract half-activated.
- This feature PR stays Draft, with auto-merge disabled; no production test,
  real FileMaker dispatch, deployment, SSH, or GHCR publish in this task.
- Admin/Portal, WordPress, other writers and content/live are unchanged.

The workflow remains dispatch-only: opening this Draft does not run FileMaker.
The scoped test commands are also available locally; absence of automatic CI is
not evidence of a successful remote FileMaker/deployment test.
