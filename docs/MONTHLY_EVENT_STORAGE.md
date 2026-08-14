# Monthly Event Storage V1

The canonical event data is stored in `public/events/data/months/YYYY-MM.json`. Top-level data other than `events` is canonical in `public/events/data/meta.json`.

`manifest.json` describes the available month files and their counts. `event-index.json` preserves global event order and maps effective public event IDs to months. `search-index.json` contains the existing normalized public-search haystacks. Both indexes are derived data and are regenerated with the manifest on every admin save.

The public dates page loads the manifest and only the displayed month. Direct links use the event index to load one month. Search uses the search index and loads only the months containing matches. Admin editors reconstruct the compatible `{ meta, events }` document and publish every affected storage artifact in one Git commit with a fresh-head conflict check.

The migration utility is `scripts/migrate-events-monthly.mjs`. It accepts an optional source JSON path and defaults to the pre-migration path. The removed monolith remains recoverable from Git history; no backup copy is kept in the repository.
