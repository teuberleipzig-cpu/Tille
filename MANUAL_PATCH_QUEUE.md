# Manual Patch Queue

Diese Datei sammelt kleine manuelle Patches für Dateien, die wegen großer Inline-HTML-Inhalte nicht zuverlässig über den GitHub-Connector überschrieben werden sollen.

## Regeln

- Nur die exakt genannten Zeilen einfügen oder entfernen.
- Danach committen und deployen lassen.
- Anschließend die Ziel-URL direkt im Browser prüfen.
- Keine Daten-Dateien ändern.
- Keine Admin-/Resident-Portal-Logik nebenbei anfassen.

---

## 1. `index.html` – Favicon/Manifest/Theme-Color ergänzen

Status: offen.

In `index.html` im `<head>` direkt nach:

```html
<link rel="canonical" href="https://www.distillery.de/">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
```

diese Zeilen einfügen:

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
```

Danach prüfen:

- `https://teuberleipzig-cpu.github.io/Tille/`
- `https://teuberleipzig-cpu.github.io/Tille/favicon.svg`
- `https://teuberleipzig-cpu.github.io/Tille/site.webmanifest`

---

## 2. `residents.html` – Favicon/Manifest/Theme-Color ergänzen

Status: offen.

In `residents.html` im `<head>` direkt nach:

```html
<link rel="canonical" href="https://www.distillery.de/residents.html">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
```

diese Zeilen einfügen:

```html
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
```

Danach prüfen:

- `https://teuberleipzig-cpu.github.io/Tille/residents.html`
- `https://teuberleipzig-cpu.github.io/Tille/favicon.svg`
- `https://teuberleipzig-cpu.github.io/Tille/site.webmanifest`

---

## 3. Test-Badge vor LIVE entfernen

Status: offen, erst kurz vor LIVE ausführen.

Betroffene Dateien:

- `index.html`
- `residents.html`

Zu entfernen ist der sichtbare Block mit Text:

```txt
TEST BUILD
public-media-fix-4
```

Erst entfernen, wenn STAGING/LIVE-Entscheidung abgeschlossen ist.
