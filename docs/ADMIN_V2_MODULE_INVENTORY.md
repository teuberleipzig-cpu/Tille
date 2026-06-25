# Admin V2 Modul-Inventar

Stand: 2026-06-25

Dieses Inventar ist der Startpunkt für die Hygiene-Arbeit. Es beschreibt, welche Dateien aktuell welche Rolle haben und wie wir sie später behandeln wollen.

Statuswerte:

- `core`: soll langfristig zentrale Hilfsfunktion werden
- `feature`: gehört fachlich zu einem Admin-/Site-Bereich
- `legacy`: bleibt zunächst als Referenz bestehen, soll aber später abgelöst werden
- `hotfix`: Übergangslösung, soll nicht dauerhaft bleiben
- `deaktiviert`: darf nichts mehr tun
- `site`: öffentliche Seite / Mainpage / Sub-Seite
- `data`: Datenquelle, nur mit ausdrücklicher Freigabe ändern

## Admin V2 Einstieg

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/admin/index.html` | legacy | Admin-V2-Markup und Script-Loader | Langfristig nur Shell + Modul-Imports |
| `public/admin/js/admin-app.js` | legacy | großer Admin-Monolith: Events, Artists, Residents, UI-State | schrittweise in Feature-Module zerlegen |
| `public/admin/github-sync.js` | legacy/core | GitHub Laden/Speichern für events.json und residents.json | in `core/github-client.js`, `github-events-repo.js`, `github-residents-repo.js` zerlegen |
| `public/admin/js/events-meta.js` | hotfix/feature | Meta-Tab, Textarea-Umbauten, Loader für Erweiterungen | Loader abbauen, Event-Meta separat modularisieren |

## Admin V2 Hotfix-Schicht

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/admin/js/admin-v2-current-fixes.js` | hotfix | Eventliste, Preview-Pfade, Meta-Tab ausblenden, Resident-News-Fix, Badge | Funktionen einzeln in echte Module überführen, danach entfernen |
| `public/admin/js/admin-v2-media-layout-fix.js` | deaktiviert | war DOM-Reparatur/Observer-Fix | deaktiviert lassen, später löschen |
| `public/admin/js/save-status-ux.js` | hotfix | Save-Status-UX | prüfen, dann in `core/status.js` oder Controller übernehmen |
| `public/admin/js/auto-github-load.js` | hotfix | automatisches Laden | prüfen, ob noch benötigt; sonst entfernen |

## Admin V2 Medien

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/admin/js/github-media.js` | hotfix/core-kandidat | Upload nach GitHub, lokale Preview, Dropzones für Events/Residents/Releases | in `core/image-upload.js`, `core/image-preview.js`, Feature-Uploadmodule zerlegen |
| `public/admin/js/residents-media.js` | feature/hotfix | Resident Presskit, Fotos, Embeds, Reorder, Delete | nach `features/residents/residents-media.js` überführen |
| `public/admin/css/github-media.css` | feature | Upload-/Dropzone-Styles | in `css/media.css` überführen |
| `public/admin/css/residents-media.css` | feature | Resident-Medien-Styles | in `css/residents.css` oder `css/media.css` überführen |

## Admin V2 Residents

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/admin/js/residents-news.js` | feature/hotfix | Resident-News-Tab, Add/Sort/Delete | nach `features/residents/residents-news.js` überführen |
| `public/admin/css/residents-news.css` | feature | Resident-News-Styles | in `css/residents.css` überführen |
| `public/admin/extensions/resident-access.js` | feature | Resident-Portal-Zugang | nach `features/residents/residents-access.js` überführen |
| `public/admin/css/resident-access.css` | feature | Resident-Zugang-Styles | in `css/residents.css` überführen |
| `public/admin/js/residents-order.js` | feature | Resident-Reihenfolge | prüfen und in Residents-Controller einordnen |
| `public/admin/css/residents-order.css` | feature | Styles für Reihenfolge | in `css/residents.css` überführen |

## Admin V2 Releases

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/admin/js/releases-core.js` | feature | Release-Grundlogik | nach `features/releases/` überführen |
| `public/admin/js/releases-extra.js` | feature/hotfix | zusätzliche Release-Funktionen | prüfen, dann integrieren oder löschen |
| `public/admin/js/releases-workflow.js` | feature | Release-Workflow UI | nach `features/releases/releases-controller.js` überführen |
| `public/admin/css/releases-admin.css` | feature | Release-Styles | in `css/releases.css` überführen |
| `public/admin/css/releases-workflow.css` | feature | Workflow-Styles | in `css/releases.css` überführen |

## Admin V2 Events

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| Eventlogik in `admin-app.js` | legacy/feature | Eventliste, Formular, Lineup, Bild, Vorschau | in `features/events/` zerlegen |
| Event-Meta in `events-meta.js` | hotfix/feature | Meta/Kalender-Felder | nach `features/events/events-meta.js` überführen |
| Event-Upload in `github-media.js` | hotfix/feature | Eventbild-Upload + Preview | nach `features/events/events-image.js` überführen |

## Admin V2 Artists

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| Artistlogik in `admin-app.js` | legacy/feature | Artistliste, Artistformular, Autocomplete | in `features/artists/` zerlegen |

## Resident-Portal

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `public/resident-portal/js/app-coverfix.js` | feature/entry | aktueller Portal-Einstieg mit Badge und Modulimports | später in `app.js` konsolidieren |
| `public/resident-portal/js/app.js` | legacy/entry | erster modularer Portal-Einstieg | prüfen, dann vereinheitlichen |
| `public/resident-portal/js/core/config.js` | core | Portal-Konfiguration | behalten |
| `public/resident-portal/js/core/state.js` | core | Portal-State | behalten |
| `public/resident-portal/js/core/dom.js` | core | DOM-Helfer | behalten |
| `public/resident-portal/js/core/github.js` | core | GitHub Laden/Speichern | behalten, später mit Admin-Core abgleichen |
| `public/resident-portal/js/core/upload.js` | core | Upload/Delete | mit Admin-Upload-Helper konsolidieren |
| `public/resident-portal/js/core/image-processing.js` | core | Bildzuschnitt | mit Admin-Image-Helper konsolidieren |
| `public/resident-portal/js/modules/profile.js` | feature | Profil | behalten |
| `public/resident-portal/js/modules/links.js` | feature | Links | behalten |
| `public/resident-portal/js/modules/news.js` | feature | News | behalten |
| `public/resident-portal/js/modules/media.js` | feature | Medien | behalten, später mit Admin-Medienlogik abgleichen |
| `public/resident-portal/js/modules/releases.js` | feature | Releases | behalten |
| `public/resident-portal/js/modules/save.js` | feature | Speichern | behalten |

## Öffentliche Seiten

| Datei | Status | Verantwortung | Ziel |
|---|---:|---|---|
| `index.html` | site | Dates/Mainpage | später JS in `public/site/js/pages/dates-page.js` auslagern |
| `news.html` | site | News-Seite | später JS in `public/site/js/pages/news-page.js` auslagern |
| `residents.html` | site | Resident-Profilseite | später JS in `public/site/js/pages/residents-page.js` auslagern |
| `resident-releases.html` | site | Release-Übersicht | später JS in `public/site/js/pages/resident-releases-page.js` auslagern |
| `contact.html` | site | Contact-Seite | einfache statische Seite, vorerst kein Modulbedarf |
| `about.html` | site | About-Seite | einfache statische Seite, später prüfen |
| `history.html` | site | History-Seite | einfache statische Seite, später prüfen |
| `feedback.html` | site | Feedback-Seite | einfache statische Seite, später prüfen |

## Datenquellen

| Datei | Status | Verantwortung | Regel |
|---|---:|---|---|
| `public/events/data/events.json` | data | Eventdaten | niemals ohne ausdrückliche Freigabe überschreiben |
| `public/residents/data/residents.json` | data | Residentdaten | niemals ohne ausdrückliche Freigabe überschreiben |

## Erste risikoarme Umbau-Ziele

Diese Schritte sind geeignet, weil sie zunächst nur neue Dateien einführen und noch keine bestehende Funktion umschalten.

1. `public/admin/js/core/media-paths.js` anlegen
2. `public/admin/js/core/image-preview.js` anlegen
3. `public/admin/js/core/github-client.js` anlegen
4. `public/admin/js/core/build-badge.js` anlegen

Erst danach werden bestehende Dateien Schritt für Schritt auf diese Helfer umgestellt.

## Nicht sofort anfassen

Folgende Bereiche sind aktuell zu riskant für einen ersten Hygiene-Schritt:

- `admin-app.js` komplett ersetzen
- `github-sync.js` komplett ersetzen
- `residents.html` komplett neu schreiben
- `events.json` oder `residents.json` automatisch migrieren
- alle Upload-Funktionen gleichzeitig umbauen

## Nächster technischer Schritt

Als nächstes soll nur eine reine Utility-Datei angelegt werden:

```txt
public/admin/js/core/media-paths.js
```

Sie soll reine Funktionen enthalten und noch nicht in Admin V2 geladen werden. Dadurch entsteht kein Funktionsrisiko.
