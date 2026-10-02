# C1/C2: explizite Eventtage, Mehrmonats-Storage und Darstellung

## Identität und Eingabe

Eine stabile Event-ID bezeichnet weiterhin genau eine Veranstaltung. Legacy-Events
mit ausschließlich `date` bleiben unverändert; es gibt keine Datenmigration.
FileMaker verwendet die bestehende V2-Hilfe `normalizeDatePatch`:

- `dates` ist optional: 1–31 Einträge vor Deduplizierung, reale YYYY-MM-DD-Tage.
- Trimmen, deduplizieren, sortieren; `date` ist der erste Wert.
- Widersprüchliches explizites `date` wird abgelehnt.
- Nach Normalisierung müssen alle Tage aufeinanderfolgen. Lücken sind Fehler;
  keine Zwischen- oder Timetable-Tage ergänzen. Die Liste ist vollständig,
  keine Start-/Ende-Kurzschreibweise.
- Ausgelassene `dates` bleiben erhalten. Gelieferte `dates` ersetzen vollständig.
- Bei vorhandenen `dates` darf ein date-only Update nur dasselbe Primärdatum liefern;
  sonst Fehler mit Aufforderung zur vollständigen Liste. Ein Eintrag bedeutet eintägig.
- Remove bleibt ID-basiert und ignoriert gelieferte `dates`.
- Unknown Fields bleiben erhalten. `tags` und `timetable` bleiben produktiv verboten.

## Storage-Verantwortung

Browser-safe `eventDates` und `eventMonthKeys` in `event-storage-model.js` validieren
persistierte Daten strikt: echte, eindeutige, sortierte, aufeinanderfolgende Tage, 1–31 Werte und
`date === dates[0]`. Keine Reparatur defekter Bestandslisten. Kein Browserimport
aus `scripts/**`; Eingabenormalisierung und Storage-Validierung sind getrennt,
teilen aber `event-date-rules.js` (UTC-Kalendertage, unabhängig von DST/Host-Zeitzone).

Pro betroffenem Monat genau eine vollständige Eventkopie, unabhängig von der Zahl
der Tage in diesem Monat. 16./17./18. Oktober bedeutet eine Oktober-Platzierung;
31. Oktober/1./2. November bedeutet eine Oktober- und eine November-Platzierung.
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
Contentcommit, SHA-Gates und Allowlist bleiben unverändert. Neue SEO-Ausgaben
verwenden denselben vollständigen Datumsbereich wie Browserlisten und -details,
ohne zusätzliche Detailseiten. JSON-LD-Startdatum und Canonical bleiben unverändert.

Acceptance prüft Summe(month.count) >= totalEvents; bei vorhandenem
totalMonthPlacements muss dieser sichere Integer exakt der Summe entsprechen.
Legacy-Manifeste ohne Zusatzfeld bleiben erlaubt; Sample-counts bleiben exakt.

## Grenzen und Cache

Kein Tags-/Timetable-Apply, kein UI-Redesign, kein WordPress, kein Live-Publishing.
Aktive Imports verwenden `event-storage-model-3`, Public Store und Admin-Storage
Version 3 sowie aktualisierte Eltern-URLs, einschließlich des vom Image-Save
browserseitig importierten SEO-Moduls (`event-seo-categories-1`). Der historische Standalone-Demoeditor
`public/events/events-createandedit.html` ist kein aktiver Admin-Owner und bleibt unverändert.

Regression: gezielte Node-Tests mit synthetischen temporären Workspaces;
der gebundene echte content/staging-Snapshot wird ausschließlich in-memory geprüft.
Keine Production-Dateien oder statischen Eventseiten in diesem Paket regenerieren.

## C2: gemeinsame öffentliche Darstellung

`event-presentation.js` wird von Dates, Legacy-Detail und SEO-Generator genutzt.
Die Kategorie folgt allein den validierten Tagen, nie `event.color`. Historische
Farbfelder und andere unbekannte Daten bleiben unverändert; nichts wird persistiert.

| Kategorie | Farbe |
| --- | --- |
| MONTAG | #9EB99B |
| DIENSTAG | #ADA0C6 |
| MITTWOCH | #CC99AF |
| DONNERSTAG | #88B9B3 |
| FREITAG | #7B9EC8 |
| SAMSTAG | #E49A78 |
| SONNTAG | #C8B48C |
| ÜBERLÄNGE (2–31 explizite Tage) | #E8CB7A |

Datumsbeispiele: `16.10.2026`, `16.–18.10.2026`, `31.10.–02.11.2026`,
`31.12.2026–02.01.2027`. Immer vollständiger Bereich, auch im Folgemonat und
in globalen Suchtreffern. Eine Clubnacht bleibt ohne zusätzliche dates eintägig.
Monatslisten sortieren nach erstem dort stattfindenden Tag, Gleichstände stabil.
Der Kalender markiert jeden expliziten Tag im aktiven Monat; bei mehreren Events
bleibt das erste Event der deterministische Link. Suche bleibt global und ID-eindeutig.

Filter zeigen nur Kategorien des gesamten sichtbaren (nicht archivierten)
Monatsbestands, Montag bis Sonntag, dann ÜBERLÄNGE. Single-Select ist toggelbar;
beim Monatswechsel nicht mehr verfügbare Auswahl wird gelöscht, leere Monate
haben keine Kategorien. Suche hebt die Auswahl auf, Kategorieauswahl leert die
Suche. `event-category-filters.js` besitzt ausschließlich die Button-Kinder des
Kategoriecontainers; Suchinput, Mobile-Panel und dessen Listener bleiben erhalten.

## Offenes Bestandsseiten-Veröffentlichungs-Gate

**Generator und neue Ausgabe implementiert bedeutet nicht Bestandsseiten aktualisiert.**
Der Composer kopiert gebundene Content-Git-Blobs unverändert. Bereits gespeicherte
`events/<id>/index.html` behalten ihren alten Header/Farben/Stylesheet-Import, bis
sie ausdrücklich neu erzeugt werden. C2 regeneriert keine echten Seiten und
ändert weder Composer noch Blob-Prüfungen. Ein späterer einzelner Event-Save
aktualisiert nur seine Seite, nicht den gesamten Bestand.

Vor Merge separat freizugeben: einen aktuellen, SHA-gebundenen Content-Snapshot
mit dem geprüften C2-Generator isoliert rendern, den Diff auf ausschließlich
Event-HTML begrenzen (Sitemap, Daten und Medien unverändert), prüfen und als
kontrollierten Contentcommit veröffentlichen. Dazu sind explizite Schreibfreigabe
für den betreffenden Contentbranch und ein mit dem C2-Code konsistenter,
SHA-geprüfter Staging-Deploy nötig. Live benötigt eine eigene Freigabe. Kein
Catch-up, Remote-FileMaker-Run oder Deployment erfolgt in diesem Codeauftrag.
Der tatsächliche FileMaker-Versand von dates[] bleibt ebenfalls separat offen.
