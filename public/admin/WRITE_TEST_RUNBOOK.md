# Admin v2 Controlled Write Test Runbook

This runbook is for the next phase after the read-only checks are green.

## Preconditions

Expected visible badge:

```txt
admin-v2-structure-17 geladen
```

Before any write test, run these in the browser console:

```txt
AdminV2HealthCheck.run()
AdminV2SmokeTest.run()
AdminV2WalkthroughTest.run()
AdminV2WriteReadiness.run()
AdminV2SnapshotReport.run()
```

Required before writing:

```txt
HealthCheck ok: true
SmokeTest ok: true
WalkthroughTest ok: true
WriteReadiness ok: true
SnapshotReport readyForWriteReport: true
Dirty flag: false
Sync state: loaded
Events SHA present
Residents SHA present
```

## Write test order

1. Events harmless text edit.
2. Reload and verify the event edit persisted.
3. Revert the event edit.
4. Reload and verify revert persisted.
5. Artists harmless text edit.
6. Reload and verify the artist edit persisted.
7. Revert the artist edit.
8. Reload and verify revert persisted.
9. Residents harmless text edit.
10. Reload and verify the resident edit persisted.
11. Revert the resident edit.
12. Reload and verify revert persisted.
13. Resident media upload test with a small disposable image.
14. Save, reload, verify image path and preview.
15. Remove the disposable image.
16. Save, reload, verify removal.
17. Release harmless text edit.
18. Reload and verify the release edit persisted.
19. Revert the release edit.
20. Reload and verify revert persisted.

## Abort conditions

Stop immediately if any of these happen:

```txt
GitHub conflict state appears
Dirty flag remains true after save and reload
Events count unexpectedly changes
Residents count unexpectedly changes
Events SHA or Residents SHA is missing
Any save touches the wrong data file
Any media delete targets an unexpected path
```

## Protected files

Do not manually edit these during code commits:

```txt
public/events/data/events.json
public/residents/data/residents.json
```

They may only change during explicit browser write tests.
