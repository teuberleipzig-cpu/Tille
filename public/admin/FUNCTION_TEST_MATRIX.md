# Admin v2 Function Test Matrix

Run this only after a hard reload and visible badge confirmation.

Expected badge for this checkpoint:

```txt
admin-v2-structure-11 geladen
```

## Read-only smoke test

- Admin page loads.
- Events view is visible.
- Artists view opens.
- Residents view opens.
- Releases view opens.
- Settings view opens.
- Status view opens.
- No duplicate tabs are visible.
- No duplicate dropzones are visible.
- Browser console can run `AdminV2HealthCheck.run()`.

## Events

- Load from GitHub.
- Select existing event.
- Change event tab: Basis, Meta / Kalender, Lineup, Bild, Beschreibung, Vorschau.
- Verify Eventbild dropzone appears once.
- Verify text fields accept spaces and Enter.
- Do not save during smoke test.

## Artists

- Open Artists.
- Search artist.
- Select artist.
- Edit field temporarily.
- Verify status updates.
- Revert field before save tests.

## Residents

- Open Residents.
- Search resident.
- Select resident.
- Switch Profil, Links, News, Medien.
- Verify News tab appears once.
- Verify Medien tab has Presskit, Slide-Bilder, Media Embeds.
- Verify existing photos render.
- Verify image controls appear once.
- Do not delete/save during smoke test.

## Releases

- Open Releases.
- Select resident/artist in release sidebar.
- Select release.
- Verify detail pane renders.
- Verify cover dropzone appears once.
- Verify text fields accept spaces and Enter.
- Do not save during smoke test.

## Write test phase, later only

- Events: edit one harmless test field, save, reload, verify.
- Artists: edit one harmless test field, save, reload, verify.
- Residents: edit one harmless test field, save, reload, verify.
- Resident media: upload test image, save, reload, verify path and preview.
- Resident media: remove test image, save, reload, verify removal.
- Presskit: upload test file, save, reload, verify path.
- Releases: edit one harmless release field, save, reload, verify.
- Release cover: upload test cover, save, reload, verify path and preview.

## Rollback point

Stable reference branch:

```txt
admin-v2-stable-media-restored
```

No data JSON files are part of this test matrix.
