# Admin v2 Index Migration Plan

Current index script state discovered from `public/admin/index.html`:

```html
<script src="./github-sync.js"></script>
<script src="./js/admin-app.js"></script>
<script src="./js/github-media.js?v=admin-upload-paths-1"></script>
<script src="./js/events-meta.js"></script>
<script src="./js/admin-v2-current-fixes.js?v=admin-v2-fixes-1"></script>
```

Target script state:

```html
<script src="./github-sync.js"></script>
<script src="./js/admin-app.js"></script>
<script src="./js/events-meta.js?v=admin-v2-structure-10"></script>
```

Reasoning:

- `events-meta.js` is currently the transition loader.
- `events-meta.js` loads `github-media.js` with the current guarded cache key.
- `admin-v2-current-fixes.js` is now only a compatibility marker and read-only health check.
- Direct old `github-media.js` and old `admin-v2-current-fixes.js` loads are tolerated because module guards exist, but they should be removed from `index.html` once the full inline HTML can be rewritten safely.

Do not remove these direct loads until the full file can be fetched/written without truncating the long inline HTML sections.

No data JSON files are part of this migration.
