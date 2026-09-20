# B1c-1: composed staging build (no deployment)

Code and content are separate immutable inputs. The current CLI deliberately
accepts **staging only**. It neither updates refs nor invokes Docker, a writer,
promotion or deployment. `docker-publish.yml` and the Dockerfile are unchanged.

## Invocation

Run from the repository; all Git objects must already exist locally. Example
PowerShell (choose a new absolute directory below the system temporary directory):

```powershell
node scripts/content/compose-site.mjs `
  --environment staging `
  --code-sha 790120ef565865014ab4786c23f521addd9c2987 `
  --content-ref content/staging `
  --content-sha c96843b1ea447d19f2b93ed9aad4e18637e75edc `
  --output "$env:TEMP/tille-composed-site"
```

There are no HEAD/main/revision defaults. Both SHA arguments must identify real
local commits, not trees/blobs/tags. A report is printed to stdout, never into the
public context. It binds environment, code SHA, content ref/SHA/tree, manifest
version, artifact ID, inventory and removal paths. Identity has no timestamp.
The supplied content SHA is the immutable input; the caller is responsible for
fetching/capturing the intended ref once. Ref/environment binding is validated.

Output must be new or empty, beneath the system temp directory or RUNNER_TEMP,
outside the repository, with existing nonsymlink ancestors. Existing nonempty
outputs are rejected. Failed composition is not a valid artifact and must never
be built; caller owns cleanup of its temporary context.

## Owners and module boundaries

- `composition-plan.mjs`: existing `planContentBuild` plus namespace replacement.
- `replacement-scope.mjs`: derives replacement ownership from CONTENT_MANIFEST.
- `snapshot-materializer.mjs`: reads raw Git blobs, writes bytes and preserves modes.
- `composition-output.mjs`: isolated empty-output boundary.
- `composition-validator.mjs`: independently re-derives expected tree and verifies disk.
- `site-composition.mjs`: orchestration; `compose-site.mjs`: argument/stdout boundary.

Tree content rules own the whole corresponding namespace. For exact-file rules,
only that file is replaced, unless the manifest explicitly assigns a
`replacementTree`. The event, resident and gallery data directories are such
fully content-owned areas. Classification/accepted content files remain manifest
version 1; the added ownership metadata does not broaden the content allowlist.
Navigation retains exact-file ownership: neighbours under public/site/data stay.
Any overlap with a manifest CODE owner fails closed (mixed namespaces must be
modelled more precisely, not blindly removed).

The composer filters **all** old content-owned paths out of the code snapshot
before materialization, then uses only validated content blobs for those paths.
This is namespace removal plus replacement, not a simple overlay; it also avoids
ever writing excluded recovery bytes. Deleted events cannot reappear. No Git
index, checkout, working-tree file or ref is used as the content source or modified.

The final validator rebuilds expectations from the pinned commits and checks
every file by Git blob hash and (on POSIX) mode, as well as exact path coverage.
Missing/extra/stale paths, changed code or content, wrong content tree and
symlink injection fail. Only 100644 content blobs are accepted. Code 100755 is
preserved on POSIX; Windows rejects it rather than silently losing its mode.
Symlinks, gitlinks, ambiguous/platform-unsafe paths, Git metadata, common secret
filenames and recognizable credential/private-key bytes are rejected. Detection
does not print secret bytes and is a guard, not a universal secrets audit.

## CI (smoke only)

The workflow checks out the exact PR head, fetches content/staging once and pins
its resulting SHA. Linux contract tests also exercise POSIX symlink/mode checks.
Composition goes to RUNNER_TEMP; its report stays alongside, outside the context.
Both smoke images use that same controlled **staging** context. The DEFAULT
image only checks Dockerfile policy (no staging noindex); it is not a live build
and never reads content/live. Neither image is pushed or deployed.

The existing HTTP matrices remain. Staging checks additionally require 404 for
two real excluded resident recovery/backup paths, without logging their contents.
The Dockerfile still removes the staging sitemap and hidden Docker configuration,
uses Disallow / and supplies noindex/nofollow/noarchive plus JSON no-store.

## Verified baseline and separate existing public-safety finding

Baseline code 790120ef565865014ab4786c23f521addd9c2987 with staging content
c96843b1ea447d19f2b93ed9aad4e18637e75edc validates to content tree
ec799d6d5eaec51d8633e99bf2e9d967e0f1279f: 1,821 content files (243 mutable,
1,578 generated). 1,843 code-snapshot paths are replaced, including 22 UNKNOWN
recovery/backup files under public/residents/data. 353 other files are retained.
No code collision; the temporary baseline context was removed after validation.

Existing Docker COPY . exposes repository files beyond site assets: scripts/,
tests/, docs/, .github/, root Markdown reports and reports/ are retained, as is
the root legacy events.json outside the replacement namespaces. The nginx
configuration does not generally deny these paths. This is an existing hosting
boundary issue, not fixed by deleting code or a broad webroot redesign here.
Git metadata and temporary/provenance files are not included by the composer.

No production data, content branch, FileMaker/Admin/Portal/WordPress routing or
deployment pipeline changes. B1c-2 remains a separate manually authorized task.
