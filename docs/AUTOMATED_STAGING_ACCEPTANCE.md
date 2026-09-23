# Automated staging acceptance

After every staging deployment, the existing `docker-publish.yml` step
`Verify deployed code content and staging security` calls the existing Node 22
entry point. `staging-deployment-e2e.mjs` first verifies the exact code/content
probe hashes and existing security endpoints. It then calls
`verifyStagingAcceptance()` in `scripts/content/staging-acceptance.mjs` inside the
same attempt. No second deployment system or browser dependency is introduced.

## Coverage

- HTTP 200 and noindex/nofollow/noarchive for `/`, `index.html`, `about.html`,
  `contact.html`, `history.html`, `news.html`, `residents.html`, `feedback.html`,
  `gallery.html`, `/public/admin/` and `/public/resident-portal/`.
- Navigation JSON: schemaVersion 1, nonempty pages, unique nonempty IDs, safe
  nonnegative integer orders, boolean visibility flags and registered homePage.
  Enabled + available internal links must resolve; disabled links are not probed.
  External HTTP(S) targets are never fetched. Equal orders remain valid.
- Event manifest: schemaVersion 1, nonnegative integer totals/counts, distinct
  YYYY-MM keys, canonical `public/events/data/months/<key>.json` paths, and total
  equal to the sum of counts. Uses the bytes already checked against the bound
  content hash, avoiding a second manifest fetch after that check.
- At most three months, sorted by key: first, middle (floor of length/2), last;
  duplicates removed. Each must contain an events array matching its count with
  unique nonempty IDs. The first event in the first nonempty sample supplies one
  static `/events/<id>/` check. If all three samples are empty despite a positive
  total, the fixed event index supplies an ID without fetching a fourth month.
- Residents JSON: residents array, unique nonempty IDs. No resident metadata is
  returned or logged. There are no fixed production artist fixtures.
- Admin/Portal HTML markers and referenced main scripts, plus their main CSS,
  must be present/reachable. No JavaScript execution, login or save takes place.
- Cache policy follows staging nginx: JSON no-store; HTML (including directory
  indexes), JS and CSS no-cache. Existing hash, healthz, robots Disallow, sitemap
  404 and recovery/config 404 checks remain mandatory.

## Failure and security

Only GET requests to `https://www-test.distillery.de`. Redirects fail; cache
busting is query-only and preserves script version parameters. Each acceptance
request/body read has a ten-second timeout within a sixty-second acceptance
attempt budget. The existing shared maximum of six attempts with ten-second
pauses covers both security and acceptance; there are no nested retry loops.

A mandatory failure makes the existing deployment job fail. Errors report a
fixed endpoint and structural reason, never response bodies, token values,
portal codes or invite IDs. Content-derived URLs are attributed to the source
JSON endpoint instead of echoed. Raw transport/parser errors are discarded.
No writes, automatic redeploy, rollback, SSH alternative or live request.

## Validation and boundaries

PR container smoke runs mocked acceptance tests and the existing local container
HTTP matrix. It never publishes to GHCR, uses SSH or contacts the remote website.
Real remote acceptance runs only in the existing post-deploy verification step.
The implementation task tests mocks only and does not trigger deployment.

Not covered: browser console/runtime errors, DOM/interactions, real-token login,
FileMaker/Admin/Resident writer mutations, external WordPress REST E2E, media
upload, content/live deployment or the live domain. Resident Access remains
locked independently. Previously accepted manual writer tests need not be rerun
for this addition.

Targeted verification:

```text
node --test tests/content-deployment-e2e.test.mjs tests/content-deployment-workflow.test.mjs tests/staging-acceptance.test.mjs tests/staging-cutover-integration.test.mjs
git diff --check
```
