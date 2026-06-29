# index.html – Manual Test Badge Patch

Status: manueller Patch nötig.

## Befund

Bei der direkten Prüfung von `index.html` ist der sichtbare Test-Badge noch vorhanden:

```html
<div aria-hidden="true" style="position:fixed;left:6px;bottom:6px;z-index:9999;background:#000;color:#fff;border:1px solid #fff;padding:3px 5px;font:10px/1.1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.03em;opacity:.86;pointer-events:none">TEST BUILD<br>public-media-fix-4</div>
```

`residents.html` und `resident-releases.html` springen nach dem Wrapper direkt in das Script und enthalten an der geprüften Stelle keinen Test-Badge mehr.

## Manueller Patch

In `index.html` den kompletten Badge-Block entfernen:

```html
<div aria-hidden="true" style="position:fixed;left:6px;bottom:6px;z-index:9999;background:#000;color:#fff;border:1px solid #fff;padding:3px 5px;font:10px/1.1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.03em;opacity:.86;pointer-events:none">TEST BUILD<br>public-media-fix-4</div>
```

Danach muss direkt auf GitHub Pages geprüft werden:

- `https://teuberleipzig-cpu.github.io/Tille/`

Erwartung:

- kein sichtbarer `TEST BUILD / public-media-fix-4`-Badge unten links
- Startseite lädt normal
- Navigation und Footer bleiben sichtbar

## Grund für manuellen Patch

`index.html` enthält sehr lange Inline-Zeilen. Frühere vollständige Datei-Ersetzungen bei großen HTML-Dateien wurden teilweise blockiert. Deshalb wird hier kein riskanter Full-File-Write versucht.
