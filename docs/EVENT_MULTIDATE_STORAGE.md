# C1: explizite Eventtage und Mehrmonats-Storage

## Identität und Eingabe

Eine stabile Event-ID bezeichnet weiterhin genau eine Veranstaltung. Legacy-Events
mit ausschließlich `date` bleiben unverändert; es gibt keine Datenmigration.
FileMaker verwendet die bestehende V2-Hilfe `normalizeDatePatch`:

- `dates` ist optional: 1–31 Einträge vor Deduplizierung, reale YYYY-MM-DD-Tage.
- Trimmen, deduplizieren, sortieren; `date` ist der erste Wert.
- Widersprüchliches explizites `date` wird abgelehnt.
- Lücken bleiben Lücken; weder Zwischen- noch Timetable-Tage werden erfunden.
- Ausgelassene `dates` bleiben erhalten. Gelieferte `dates` ersetzen vollständig.
- Bei vorhandenen `dates` darf ein date-only Update nur dasselbe Primärdatum liefern;
  sonst Fehler mit Aufforderung zur vollständigen Liste. Ein Eintrag bedeutet eintägig.
- Remove bleibt ID-basiert und ignoriert gelieferte `dates`.
- Unknown Fields bleiben erhalten. `tags` und `timetable` bleiben produktiv verboten.

## Storage-Verantwortung

Browser-safe `eventDates` und `eventMonthKeys` in `event-storage-model.js` validieren
persistierte Daten strikt: echte, eindeutige, sortierte Tage, 1–31 Werte und
`date === dates[0]`. Keine Reparatur defekter Bestandslisten. Kein Browserimport
aus `scripts/**`; Eingabenormalisierung und Storage-Validierung sind getrennt.

Pro betroffenem Monat genau eine vollständige Eventkopie, unabhängig von der Zahl
der Tage in diesem Monat. 16./18. Oktober bedeutet eine Oktober-Platzierung;
31. Oktober/2. November bedeutet eine Oktober- und eine November-Platzierung.
Monatsreihenfolge bleibt source-relativ. Kein Occurrence-Modell, keine neue ID.

Manifest bleibt Schema 1:

- `totalEvents`: Zahl eindeutiger Events.
- `months[].count`: Zahl der Objekte im konkreten Monatsfile.
- Neues additives `totalMonthPlacements`: Summe aller Monats-counts, mindestens totalEvents.

Eventindex und Suchindex behalten einen Eintrag je ID. `month` bleibt Primärmonat.
Public `loadMonth` liefert die jeweilige Platzierung; `resolveEvent` verwendet den
Primärmonat; Suche liefert weiterhin höchstens einen Treffer pro Event.

## Rekonstruktion und atomare Änderungen

Identische Kopien werden zusammengeführt; der vollständige Inhalt einschließlich
unbekannter verschachtelter Felder wird verglichen (Objektschlüssel-Reihenfolge ist
irrelevant, Array-Reihenfolge nicht). Konflikte, doppelte IDs im selben Monat,
fehlende Monatskopien, doppelte/unvollständige Index-IDs und falsche globale
Reihenfolge/Primärmonate schlagen fehl. Eindeutige Zahl muss totalEvents entsprechen.
Globale Reihenfolge kommt weiterhin aus event-index.order.

Der bestehende `storageArtifacts`-Diff umfasst alte und neue Monatsfiles auch bei
vollständigem Datumsersatz. Remove entfernt alle Platzierungen, aber nur eine
kanonische Seite `events/<id>/index.html` und eine Sitemap-URL. Bestehender atomarer
Contentcommit, SHA-Gates und Allowlist bleiben unverändert. SEO verwendet vorerst
den bestehenden primären Datumsheader, ohne zusätzliche Detailseiten.

Acceptance prüft Summe(month.count) >= totalEvents; bei vorhandenem
totalMonthPlacements muss dieser sichere Integer exakt der Summe entsprechen.
Legacy-Manifeste ohne Zusatzfeld bleiben erlaubt; Sample-counts bleiben exakt.

## Grenzen und Cache

Kein Tags-/Timetable-Apply, keine Kategorien/Farben/Filter, kein UI-Redesign,
kein WordPress, kein Live-Publishing. Kalenderdarstellung folgt separat.
Aktive Imports verwenden `event-storage-model-2`, Public Store und Admin-Storage
Version 2 sowie aktualisierte Eltern-URLs, einschließlich des vom Image-Save
browserseitig importierten SEO-Moduls (`event-seo-storage-2`). Der historische Standalone-Demoeditor
`public/events/events-createandedit.html` ist kein aktiver Admin-Owner und bleibt unverändert.

Regression: gezielte Node-Tests mit synthetischen temporären Workspaces;
der gebundene echte content/staging-Snapshot wird ausschließlich in-memory geprüft.
Keine Production-Dateien oder statischen Eventseiten in diesem Paket regenerieren.
