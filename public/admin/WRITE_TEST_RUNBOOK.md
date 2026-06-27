# Admin v2 Controlled Write Test Runbook

This runbook is for the next phase after the read-only checks are green.

## Preconditions

Expected visible badge:

```txt
admin-v2-structure-18 geladen
```

Before any write test, run these in the browser console:

```txt
AdminV2HealthCheck.run()
AdminV2SmokeTest.run()
AdminV2WalkthroughTest.run()
AdminV2WriteReadiness.run()
AdminV2SnapshotReport.run()
AdminV2WriteBaseline.begin('before-first-write-test')
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
Baseline captured
```

## Preflight before each human-triggered save

Run the matching preflight immediately before clicking a save button:

```txt
AdminV2SavePreflight.run('events')
AdminV2SavePreflight.run('artists')
AdminV2SavePreflight.run('residents')
AdminV2SavePreflight.run('resident-media')
AdminV2SavePreflight.run('releases')
AdminV2SavePreflight.run('release-cover')
```

Expected:

```txt
ok: true
failedNames: []
```

## After save and reload

Run:

```txt
AdminV2SnapshotReport.run()
AdminV2WriteBaseline.verifyAfterReload({eventsChanged:true,residentsChanged:false})
```

Adjust the expectation for the tested area:

```txt
Events or artists test:
{eventsChanged:true,residentsChanged:false}
Residents, media or releases test:
{eventsChanged:false,residentsChanged:true}
No-op/revert verification:
Use AdminV2WriteBaseline.status() and inspect hashes/counts manually.
```

## Write test order

1. Events harmless text edit.
2. Save events.
3. Reload and verify the event edit persisted.
4. Revert the event edit.
5. Save events.
6. Reload and verify revert persisted.
7. Artists harmless text edit.
8. Save artists/events.
9. Reload and verify the artist edit persisted.
10. Revert the artist edit.
11. Save artists/events.
12. Reload and verify revert persisted.
13. Residents harmless text edit.
14. Save residents.
15. Reload and verify the resident edit persisted.
16. Revert the resident edit.
17. Save residents.
18. Reload and verify revert persisted.
19. Resident media upload test with a small disposable image.
20. Save residents.
21. Reload and verify image path and preview.
22. Remove the disposable image.
23. Save residents.
24. Reload and verify removal.
25. Release harmless text edit.
26. Save residents.
27. Reload and verify the release edit persisted.
28. Revert the release edit.
29. Save residents.
30. Reload and verify revert persisted.

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
A preflight check is not ok
A baseline verification reports an unexpected hash/count change
```

## Protected files

Do not manually edit these during code commits:

```txt
public/events/data/events.json
public/residents/data/residents.json
```

They may only change during explicit browser write tests.
