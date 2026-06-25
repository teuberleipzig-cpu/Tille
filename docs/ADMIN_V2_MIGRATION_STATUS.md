# Admin V2 Migration Status

Stand: laufende Vorbereitung der modularen Admin-Struktur.

## Grundregel

Alle in diesem Dokument genannten neuen Module sind aktuell nur vorbereitet.
Sie sind nicht in `public/admin/index.html`, `public/admin/js/admin-app.js` oder `public/admin/js/events-meta.js` eingebunden.

Damit gilt aktuell:

- keine Runtime-Auswirkung auf Admin V2
- keine Änderung an bestehenden Uploads
- keine Änderung an bestehenden Formularen
- keine Änderung an bestehenden Daten-JSONs
- keine Änderung an Events- oder Residents-Rendering

## Bereits vorbereitete Core-Module

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/core/media-paths.js` | vorbereitet, nicht geladen | Medienpfade normalisieren |
| `public/admin/js/core/image-preview.js` | vorbereitet, nicht geladen | lokale Preview-URLs verwalten |
| `public/admin/js/core/github-client.js` | vorbereitet, nicht geladen | GitHub Contents API kapseln |
| `public/admin/js/core/build-badge.js` | vorbereitet, nicht geladen | Build-Badge zentralisieren |
| `public/admin/js/core/dom.js` | vorbereitet, nicht geladen | DOM-Helfer zentralisieren |
| `public/admin/js/core/text.js` | vorbereitet, nicht geladen | Text-/Slug-Helfer zentralisieren |
| `public/admin/js/core/dates.js` | vorbereitet, nicht geladen | Datums-Helfer zentralisieren |
| `public/admin/js/core/state-store.js` | vorbereitet, nicht geladen | kleinen State-Store vorbereiten |
| `public/admin/js/core/json-store.js` | vorbereitet, nicht geladen | JSON lesen, schreiben, klonen |
| `public/admin/js/core/validation.js` | vorbereitet, nicht geladen | Formularvalidierung vorbereiten |
| `public/admin/js/core/status.js` | vorbereitet, nicht geladen | Statusmeldungen vorbereiten |

## Bereits vorbereitete Entry-Datei

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/app.modular.js` | vorbereitet, nicht geladen | zukünftiger modularer Einstiegspunkt |

## Bereits vorbereitete Event-Module

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/features/events/events-list.js` | vorbereitet, nicht geladen | Eventliste, Filter, Sortierung, Auswahl |
| `public/admin/js/features/events/events-form.js` | vorbereitet, nicht geladen | Event-Basisdaten, Draft, Validierung |
| `public/admin/js/features/events/events-image.js` | vorbereitet, nicht geladen | Eventbild-Pfade und Preview-Schnittstelle |

## Bereits vorbereitete Resident-Module

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/features/residents/residents-list.js` | vorbereitet, nicht geladen | Residentliste, Filter, Sortierung, Auswahl |
| `public/admin/js/features/residents/residents-form.js` | vorbereitet, nicht geladen | Resident-Basisdaten, Draft, Validierung |
| `public/admin/js/features/residents/residents-media-module.js` | vorbereitet, nicht geladen | Resident-Medienliste normalisieren und sortieren |
| `public/admin/js/features/residents/residents-news-module.js` | vorbereitet, nicht geladen | Resident-News normalisieren, sortieren und bearbeiten |

## Aktive Legacy-/Hotfix-Dateien

Diese Dateien steuern weiterhin die echte Admin-V2-Oberfläche:

| Datei | Status |
| --- | --- |
| `public/admin/js/admin-app.js` | aktiv |
| `public/admin/github-sync.js` | aktiv |
| `public/admin/js/events-meta.js` | aktiv |
| `public/admin/js/admin-v2-current-fixes.js` | aktiv |
| `public/admin/js/github-media.js` | aktiv |
| `public/admin/js/residents-media.js` | aktiv |
| `public/admin/js/residents-news.js` | aktiv |
| `public/admin/js/admin-v2-media-layout-fix.js` | deaktiviert / inert |

## Nicht anfassen ohne expliziten Auftrag

- `public/events/data/events.json`
- `public/residents/data/residents.json`
- bestehende Script-Einbindungen in `public/admin/index.html`
- bestehende Hotfix-Lader in `public/admin/js/events-meta.js`

## Nächste sinnvolle Migrationsschritte

1. Erst weitere Modulgrenzen dokumentieren und vorbereiten.
2. Danach ein einziges kleines Modul testweise einbinden.
3. Vor jeder Einbindung klären, welche bestehende Legacy-Funktion ersetzt wird.
4. Keine parallelen Reparatur-Layer mit Intervallen oder DOM-Observern einführen.
5. Nach jeder echten Einbindung Testmatrix prüfen.
