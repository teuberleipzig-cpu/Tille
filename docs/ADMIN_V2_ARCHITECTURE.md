# Admin V2 Architektur- und Umbau-Regeln

Stand: 2026-06-25

Dieses Dokument beschreibt, wie Admin V2 und die öffentlichen Sub-Seiten künftig strukturiert werden sollen. Ziel ist nicht ein großer Rewrite, sondern ein kontrollierter Umbau in kleinen, einzeln testbaren Schritten.

## Ziel

Die Admin-V2-Seite, das Resident-Portal und die öffentlichen Sub-Seiten sollen so modularisiert werden, dass Änderungen an einem Bereich nicht mehr versehentlich andere Bereiche beschädigen.

Konkrete Ziele:

- weniger Monolith-Dateien
- klare Verantwortlichkeiten pro Datei
- keine globalen Hotfix-Schichten mehr
- keine unkontrollierten DOM-Reparaturen
- Upload-, Preview-, GitHub- und Mainpage-Pfadlogik nur noch an einer Stelle
- kleine Commits mit klarer Testliste
- jederzeit nachvollziehbarer Rollback

## Grundregel

Jede Änderung muss einem klaren Modul gehören.

Beispiele:

- Eventliste: nur Eventliste, Filter, Sortierung, Mehr anzeigen
- Eventbild: nur Upload, lokaler Preview, gespeicherter Bildpfad
- Resident-News: nur News-Liste, Sortierung, Hinzufügen, Löschen
- Resident-Medien: nur Fotos, Presskit, Embeds, Löschen aus GitHub
- GitHub-Client: nur Laden, Speichern, Löschen über GitHub API

Ein Modul darf nicht ohne ausdrücklichen Grund fremde DOM-Bereiche verändern.

## Verbotene Patterns

Folgende Patterns haben bereits Fehler verursacht und sind im Normalfall verboten:

```js
setInterval(repairEverything, 700)
```

```js
new MutationObserver(() => repairDom())
```

```js
window.renderSomething = function() { ... }
```

```js
window.readSomething = function() { ... }
```

```js
document.querySelectorAll('img').forEach(...)
```

Ausnahmen sind nur erlaubt, wenn sie direkt im Commit begründet werden und eine enge Scope-Begrenzung haben.

## Bestehende Problemklasse

Während des Umbaus sind Fehler entstanden, weil mehrere Dateien gleichzeitig dieselben Funktionen beeinflusst haben:

- `admin-app.js` rendert Admin-Grundfunktionen
- `events-meta.js` lädt weitere Erweiterungen nach
- `github-media.js` verändert Upload- und Preview-Verhalten
- `residents-media.js` rendert Resident-Medien
- `residents-news.js` rendert Resident-News
- `admin-v2-current-fixes.js` überschreibt Teile der Admin-Logik
- `admin-v2-media-layout-fix.js` war ein später Hotfix und wurde deaktiviert

Ziel ist, diese Patch-Schicht schrittweise abzubauen und in echte Module zu überführen.

## Zielstruktur Admin V2

Langfristig soll die Admin-Struktur ungefähr so aussehen:

```txt
public/admin/
  index.html

  css/
    admin.css
    events.css
    residents.css
    media.css
    releases.css
    status.css

  js/
    app.js

    core/
      config.js
      state.js
      dom.js
      build-badge.js
      dates.js
      validation.js
      media-paths.js
      image-preview.js
      image-upload.js
      github-client.js
      github-events-repo.js
      github-residents-repo.js

    features/
      events/
        events-controller.js
        events-list.js
        events-form.js
        events-lineup.js
        events-image.js
        events-preview.js
        events-meta.js
        events-save.js

      residents/
        residents-controller.js
        residents-list.js
        residents-profile.js
        residents-links.js
        residents-news.js
        residents-media.js
        residents-releases.js
        residents-access.js
        residents-save.js

      artists/
        artists-controller.js
        artists-list.js
        artists-form.js

      releases/
        releases-controller.js
        releases-list.js
        releases-form.js
        releases-cover.js

    legacy/
      admin-app.legacy.js
      github-sync.legacy.js
```

Diese Struktur wird nicht auf einmal eingeführt. Sie wird Schritt für Schritt aufgebaut.

## Zielstruktur öffentliche Seiten

Die öffentlichen Seiten sollen perspektivisch weniger Inline-JavaScript enthalten.

```txt
public/site/
  js/
    core/
      data-loader.js
      dom.js
      media-paths.js
      dates.js

    components/
      event-card.js
      resident-slider.js
      resident-news.js
      resident-releases.js
      media-embed.js

    pages/
      dates-page.js
      news-page.js
      residents-page.js
      resident-releases-page.js
```

Auch hier gilt: schrittweise, nicht als Vollumbau.

## Datenfluss

Der Datenfluss muss immer eindeutig bleiben:

```txt
Admin V2 / Resident-Portal
  → schreibt events.json oder residents.json
  → öffentliche Seiten lesen diese JSON-Dateien
  → Mainpage rendert daraus Dates, News, Residents und Releases
```

Admin V2 und Resident-Portal dürfen öffentliche Seiten nicht direkt manipulieren. Die gemeinsame Schnittstelle ist JSON.

## Medienpfade

Medienpfade waren eine zentrale Fehlerquelle. Deshalb gilt:

### Repository-Pfad

Für GitHub Upload/Delete:

```txt
public/events/media/...
public/residents/media/...
```

### Öffentlicher Mainpage-Pfad

Für gespeicherte JSON-Daten ist bevorzugt:

```txt
public/events/media/...
public/residents/media/...
```

Die öffentliche Website kann diese Pfade relativ laden.

### Admin-Preview

Admin-Preview darf nicht auf GitHub Pages Deploy warten. Direkt nach Upload muss lokal angezeigt werden:

```txt
blob:...
```

Regel:

- gespeicherter JSON-Pfad bleibt `public/...`
- sofortige Admin-Vorschau nutzt `blob:...`
- nach Reload nutzt Admin wieder den gespeicherten `public/...` Pfad

## Upload-Regeln

Jede Upload-Funktion braucht drei getrennte Schritte:

1. lokale Preview erzeugen
2. Datei nach GitHub hochladen
3. gespeicherten Datenpfad aktualisieren

Diese drei Schritte dürfen nicht vermischt werden.

Beispiel:

```txt
localPreview = createObjectURL(file)
repoPath = public/residents/media/submod/photos/photo-123.jpg
storedPath = public/residents/media/submod/photos/photo-123.jpg
```

## Lösch-Regeln für Medien

Wenn ein Bild oder eine Mediendatei aus der Admin-UI gelöscht wird, muss unterschieden werden:

1. Datei aus GitHub löschen
2. Pfad aus JSON entfernen
3. JSON speichern

Die UI muss klar sagen, ob nur lokal aus der Liste entfernt wurde oder ob die GitHub-Datei bereits gelöscht wurde.

## Build-Badge-Regel

Jede sichtbare Admin-/Portal-Frontend-Änderung muss einen Build-Badge haben.

Beispiele:

```txt
admin-v2-core-1 geladen
portal-modular-1 news-media-fix-3 geladen
```

Der Badge dient als Test-Sicherheit gegen Browsercache.

## Testpflicht pro Änderung

Jede Funktionsänderung braucht eine kleine Testliste.

Beispiel Eventbild:

```txt
[ ] Admin V2 lädt
[ ] Badge zeigt richtige Version
[ ] Event auswählen
[ ] Bild hochladen
[ ] Bild erscheint sofort lokal
[ ] Vorschau-Tab zeigt Bild sofort lokal
[ ] Speichern
[ ] Reload
[ ] Bild bleibt sichtbar
[ ] Mainpage lädt Bild ohne 404
```

## Commit-Regeln

Ein Commit soll möglichst nur eine Verantwortung ändern.

Gute Commit-Scope-Beispiele:

- `Add admin media path helper`
- `Extract resident news rendering module`
- `Add local image preview registry`
- `Switch event image upload to core helper`

Schlechte Commit-Scope-Beispiele:

- `Fix admin`
- `Update everything`
- `More fixes`
- `Cleanup and media and releases and news`

## Rollback-Regeln

Jeder Umbau-Schritt muss rückgängig machbar sein.

Regel:

- alte Datei zunächst behalten
- neues Modul parallel einführen
- Einstiegspunkt gezielt umschalten
- nach Test erst alte Logik entfernen

Wenn eine Änderung die Seite einfriert oder Hauptfunktionen blockiert:

1. neuen Loader entfernen
2. betroffene neue Datei zu No-Op machen
3. Build-Badge erhöhen
4. erst danach weiterdebuggen

## Reihenfolge der nächsten Hygiene-Schritte

### Schritt 1: Dokumentation

Dieses Dokument anlegen.

### Schritt 2: Inventar

Eine Datei anlegen:

```txt
docs/ADMIN_V2_MODULE_INVENTORY.md
```

Darin werden aktuelle Dateien klassifiziert:

- behalten
- legacy
- umbauen
- deaktiviert
- später löschen

### Schritt 3: Core-Medienpfade

Neue Datei:

```txt
public/admin/js/core/media-paths.js
```

Zuerst nur reine Funktionen. Noch nicht aktiv in Admin V2 einbinden.

### Schritt 4: Core-Preview-Registry

Neue Datei:

```txt
public/admin/js/core/image-preview.js
```

Zuerst nur reine Funktionen. Noch nicht aktiv in Admin V2 einbinden.

### Schritt 5: Eventliste isolieren

Erst danach darf Eventliste aus `admin-app.js` herausgelöst werden.

### Schritt 6: Resident-News isolieren

Danach Resident-News vollständig in ein Modul mit eigenem State und eigenem Render.

### Schritt 7: Resident-Medien isolieren

Danach Resident-Medien inkl. Upload, Preview, Reorder, Delete.

## Aktuelle Sicherheitsentscheidung

Die Seite ist aktuell empfindlich. Deshalb gilt bis zur Stabilisierung:

- keine neuen großen Hotfix-Dateien
- keine neuen globalen Wrapper
- keine neuen Observer
- keine neuen Intervalle
- keine Daten-JSONs anfassen ohne ausdrückliche Freigabe
- keine gleichzeitige Änderung an Admin V2 und Mainpage im selben Schritt

## Kurzfassung

Wir bauen nicht schneller, indem wir mehr auf einmal anfassen. Wir bauen stabiler, indem jedes Modul eine klare Grenze bekommt.

Jeder nächste Schritt muss klein genug sein, dass man ihn in wenigen Minuten testen und bei Bedarf zurückrollen kann.
