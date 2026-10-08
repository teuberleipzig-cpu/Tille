# P2 — positive public webroot boundary

## Binding and baseline

- Code/main: `7bf8d9115db5d1dfe9dba277b3d9473329d0aa28` (P1 merge).
- Content/staging: `2b907632c17dfbeefce4fce4f70d6e63e9e9134b`.
- Content/live ref unchanged: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`; its content was not read.
- Unmodified composer produced a valid isolated temporary staging context:
  2,267 files, including 1,821 content files, content tree `762137d35a7f939beb250325e6d9e3d5132e8ea7`.
- Baseline: 136/136 tests passed, no skips, across composition, composition workflow,
  deployment, deployment E2E/workflow/CLI, staging cutover integration and acceptance.
- Local Windows Docker executable is unavailable. No local Docker/HTTP baseline PASS
  is claimed. Exact-head GitHub Linux smoke is the mandatory real-container gate.

## Confirmed finding (paths/status only)

The baseline composed context includes scripts/, tests/, docs/, .github/, reports/,
root Markdown, root events.json and Admin root checkpoint/review files. Existing
`COPY .` copies these into the nginx document root; its cleanup only removes docker/.
Both nginx configs serve existing static files, with no general internal-path deny.
Thus representative existing files would be HTTP-readable (configuration-derived
finding; not a request against a deployed server). No private bodies were printed.

## Positive ownership

Final root files: public `*.html`, robots.txt, sitemap.xml (DEFAULT only),
site.webmanifest and favicon.svg. Also `.well-known/security.txt`.

Public directories: assets/, events/, news/, residents/; public/events/,
public/residents/, public/gallery/, public/site/, public/resident-portal/.
Admin is narrower: root *.html/*.js plus css/, js/, extensions/ and public/.
No blanket COPY of the repository or public/.

The inventory therefore retains 2,027 baseline public files (2,026 on staging)
and excludes 240 internal files. It includes all composed public content; staging
intentionally excludes sitemap. Generated resident profiles, root favicon and
security.txt are required additions beyond the initial example allowlist.
The base nginx image's default root is cleared **before** copying the allowlist.
No internal repository files are copied and subsequently scrubbed.

Build-only inputs: docker/nginx.conf, docker/nginx.staging.conf and
robots.staging.txt go to /tmp, never the webroot; removed after target selection.
Default remains live; only explicit staging selects staging config/robots and
removes sitemap. Existing nginx caching, healthz, custom 404 and noindex unchanged.

## Reference / legacy audit

`tests/helpers/public-webroot.mjs` deterministically inventories files and literal
HTML links/assets, CSS URLs, JS path strings, manifest and sitemap references.
Baseline: 1,712 existing local reference targets, none outside the allowlist.
This is not a full arbitrary-JavaScript interpreter; complete namespace retention
and real HTTP byte comparisons supplement it. No maps/debug dumps/build scripts
were found in the final public inventory. Admin Markdown/checkpoints are excluded.

Root events.json has no active public fetch/import dependency. The remaining
browser code uses `events.json` as a Blob download filename in the legacy event
editor and Admin export, not a server URL. Current event storage uses
public/events/data/manifest.json and monthly/index files. The migration script's
default input is public/events/data/events.json, not root events.json.
Root events.json remains in Git/composed context but is not published.

## Verification

`tests/public-webroot.test.mjs` locks explicit COPY sources/destinations, exclusion
of arbitrary new internal namespaces, required public references and applications,
target semantics and both CI probe invocations.

The new read-only smoke helper runs against **both** actual Docker containers:

- exact complete filesystem inventory, no symlinks;
- docker exec absence assertions for internal directories/files (not just nginx denies);
- representative internal HTTP paths return real 404 + custom body;
- staging noindex on positive/negative responses; DEFAULT no staging noindex;
- all public files except internal 404.html return 200 and original SHA256 bytes;
- staging robots compared against robots.staging.txt input;
- application/directory index routes remain accessible;
- old healthz/robots/sitemap/cache/recovery HTTP matrices retained unchanged.

The helper prints counts/status, never response bodies. It accepts only local
HTTP loopback containers; no external submission, auth, write or deployment.
CI uses exact PR code with pinned staging content; DEFAULT never reads live content.

Final local tests: 156/156 PASS, zero skips (all eight baseline suites, the five
new boundary tests and the existing news SEO suite including Docker sitemap policy).
The exact-head Linux container result is recorded in the PR/report.
No tests skipped or safety gates removed. No runtime JS/CSS change, so no cache bump.

## Non-scope / remaining gates

No data, generated pages, media, writer, Admin/Portal behavior, access unlock,
feedback/privacy, tracking, server, SSH, DNS or nginx configuration change.
No merge, deployment, workflow dispatch, contentbranch write or live action.
DEFAULT smoke is not live approval. External legal/organizational reviews,
real FileMaker E2E checks and the remaining go-live gates are separate.
