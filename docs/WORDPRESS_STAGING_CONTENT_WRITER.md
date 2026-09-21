# B1d-4 — WordPress staging content writer

⚠️ DO NOT MERGE YET

Preparation only. Dependencies #104 (composed staging deployment), #105 (FileMaker),
#106 (Admin), #107 (Portal) remain separate Drafts. No branch integration, live
activation, real WordPress run or deployment is part of this implementation.

## Baseline

- main: `4e723ca23465419b7db53408de5b7e9b05757fdd`
- content/staging: `c96843b1ea447d19f2b93ed9aad4e18637e75edc`
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`
- Development branch: `codex/wordpress-staging-content-writer`

## Source and environment contracts

The existing `WORDPRESS_BASE_URL` repository variable remains the single external
source. Existing REST published-only filtering, URL validation, source-origin
protection, sanitization, featured/inline images, figure/figcaption rendering and
secret/unsafe-URL output checks are unchanged. This does **not** create separate
WordPress staging/live databases or preview/draft sources: it copies the existing
REST publish state into a different repository target.

`workflow_dispatch` is the only trigger. Both modes require explicit `environment`
with no YAML default. The Node adapter reuses `scripts/content/environments.mjs`.
Only `staging` maps to `content/staging`. Missing/invalid values fail. `live` fails
in both modes with **Live WordPress publishing is not activated yet.** No fallback
to main, staging or live. The source is not contacted when environment validation
fails. Only workflows started on main in `teuberleipzig-cpu/Tille` may proceed.

## Code/content snapshot and composition

Actions checks out `github.sha`, not a moving main checkout. The runner requires
that local HEAD equal that full SHA, and that current remote main equal it too.
It binds the remote `content/staging` SHA once. Both commits must already exist
locally after fetching snapshot candidates. Later head reads only verify those
bindings; they never silently adopt new SHAs.

`scripts/news/staging-content.mjs` calls the existing **composeSite** implementation
with environment, code SHA and content SHA. Output is an isolated directory below
`RUNNER_TEMP`, outside the repository. No content-branch code checkout, second
composer or code copied from #104–#107 is introduced.

Generator modules run from the bound code checkout. `prepareNewsSync` runs against
the composed site's News files and sitemap. Its optional `returnFiles` result lets
the adapter validate proposed output without applying it to the code checkout.
Existing generic fixture/rendering calls keep their behavior.

The shared sitemap comes exclusively from bound staging content. Existing
`updateNewsSitemap` replaces News entries; an additional adapter check compares
all non-News XML blocks before/after, including Event and Resident entries.
Public canonical URLs remain the existing renderer contract; they are not evidence
that the sitemap was read from main or content/live.

## Content-only commit

Two gates apply to every changed/output path:

1. Central `validateContentChanges` rejects CODE, UNKNOWN and noncanonical paths.
2. Existing, narrower News allowlist accepts only `news.html`, `news/index.html`,
   `news/<safe-slug>/index.html`, and `sitemap.xml`.

The adapter validates the complete base content tree, reuses its unaffected blob
SHAs and creates blobs only for changed generated files. Removed articles are
omitted from the new tree, not retained as orphans. `git mktree` / `commit-tree`
produce a commit with **one parent: bound content/staging SHA**. Complete resulting
content-tree validation and actual diff validation run before push. Other content
blobs (including binary media) remain byteidentical. No index, checkout or local
automation branch is needed; no application code is added to the content tree.

Main and staging gates run after generation, before commit construction, before
push, after push and after PR verification. Push updates only
`automation/wordpress-news/staging` with an explicit expected-old-SHA
`--force-with-lease`. There is no unconditional force push, automatic rebase, retry or catch-up.
A race after push can leave a candidate branch/PR for inspection, but the run fails
and never claims it is current. No content/staging or main write is performed by
the sync itself.

## Draft PR ownership and editorial review

Generated content PR:

- head: `automation/wordpress-news/staging`
- base: `content/staging`
- Draft, human review required, no auto-merge, no automatic Ready/merge.

An owned PR must have the fixed repository on **both** sides, the exact refs,
`github-actions[bot]` author and the versioned workflow provenance marker at the
start of its body. An open candidate must be Draft, have no auto-merge and have
the exact expected base/head SHAs. Multiple or foreign WordPress automation PRs
fail closed. Ordinary unrelated content PRs are not modified.

After create/update, the adapter freshly verifies metadata, retrieves every page
of changed files, matches the reported total, rejects duplicates and validates
current and rename-previous paths against both scope gates. Missing rename origins
or a GitHub file list beyond its 3,000-file completeness limit fail closed.
Metadata is read again afterwards to detect intervening changes.

No-change creates no commit, push, new PR or deployment. An existing *verified own*
stale Draft may be closed; no optional comment can block closure because none is
sent. Branch deletion is not automatic. A retained branch can be reused only with
a freshly verified closed own PR whose head matches it (including an earlier
human-reviewed merged PR); orphan/unowned branches require manual reconciliation.
Legacy `automation/wordpress-news-sync` PRs against main are not automatically
retargeted or closed. Resolve them explicitly during coordinated cutover.

## Validate-only and permissions

Validate-only composes, fetches WordPress via the existing REST contract, generates
temporary output, checks content safety/scope/sitemap, verifies bound heads and
reports the diff plus both SHAs. It does not create Git blobs/trees/commits/refs,
push, call PR APIs or dispatch a workflow. Checkout/fetch only acquire the input
snapshots; temporary rendering files are cleaned up.

Permissions remain:

- validate-only: `contents: read`
- sync-pr: `contents: write`, `pull-requests: write`

No Actions write, packages write, SSH or deployment permission. The existing global
`wordpress-news-sync` concurrency group with `cancel-in-progress: false` remains.
Repository Actions policy must permit bot-created PRs; otherwise fail visibly.

## Publication operator contract — later, not this task

1. Review the generated WordPress content PR and all changed files.
2. Merge manually using exact expected-head-SHA protection into content/staging.
3. Verify the resulting content/staging merge SHA and current main SHA.
4. With #104 integrated/activated, separately dispatch `docker-publish.yml` using
   `expected_sha=<full-current-main-sha>` and
   `expected_content_sha=<full-verified-content-staging-merge-sha>`.

The WordPress workflow never dispatches this deployment. Never use a single-SHA
request or substitute a branch name/short SHA. Movement of either ref needs a fresh
operator decision, not an automatic retry.

## External media and deliberately excluded features

Images remain validated external HTTP(S) URLs. No local mirroring, media download,
base64, new upload mechanism or image archive. A content SHA reproduces generated
HTML, **not necessarily external media bytes** served later at those URLs.

About/History, WordPress Pages API/Page IDs, their images, DE/EN versions and a new
WordPress preview/live editorial architecture are separate future product work.

## Verification and CRLF

Use existing fixture WordPress posts and mock HTTP only; never query the real
WORDPRESS_BASE_URL or dispatch the workflow during implementation verification.
New content tests use synthetic temporary Git repositories. They cover exact
parents, scopes, deletions, unchanged binary/content blobs, sitemap preservation,
read-only validation and code/content races. PR tests mock all GitHub APIs/pushes
and cover pagination, ownership, stale closure, foreign targets and SHA movement.

Required suites: WordPress sync/staging, content foundation/bootstrap/composition,
plus existing headless WordPress and News SEO tests. No production content is
generated or modified by these tests. New workflow assertions normalize CRLF
locally where needed. Unchanged legacy LF-sensitive assertions are not globally
rewritten; if they fail after Windows checkout, distinguish that from semantics
and verify against the Git-object/LF representation.

## Preconditions before merge

- Coordinated activation with #104; #105/#106/#107 writers ready or explicitly paused.
- Fresh main/content/staging/content/live reconciliation and shared-sitemap review.
- Acceptance of the current single WordPress published-source behavior.
- Review bot PR permissions/provenance and resolve any old/orphan automation branch.
- Controlled staging-only end-to-end exercise separately authorized after integration.
- Agreed human-review, SHA-gated merge and dual-SHA deployment operator procedure.
- Explicit coordinated cutover window. Live remains blocked.

No Admin, Portal, FileMaker, deployment workflow, public UI, production content or
content-branch changes belong to this Draft. Stop after creating the development PR.
