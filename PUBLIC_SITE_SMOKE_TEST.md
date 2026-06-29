# Public Site Smoke Test

Status: bestanden auf GitHub-Pages-Testumgebung.
Datum: 2026-06-29.
Testergebnis: manuell durch Browser-Test bestätigt.

## Getestete Umgebung

- GitHub Pages: `https://teuberleipzig-cpu.github.io/Tille/`
- Test-Badge sichtbar: `TEST BUILD / public-media-fix-4`

## Geprüfte Seiten

- `/`
- `/residents.html`
- `/resident-releases.html`
- `/news.html`
- `/about.html`
- `/contact.html`
- `/history.html`
- `/feedback.html`
- `/feedback-thanks.html`
- `/impressum.html`
- `/datenschutz.html`
- `/404.html`

## Ergebnis

- [x] Keine relevanten Console-Fehler mehr gemeldet.
- [x] Keine relevanten Media-404-Fehler mehr gemeldet.
- [x] Impressum ist auf allen geprüften Seiten sichtbar.
- [x] Datenschutz ist auf allen geprüften Seiten sichtbar.
- [x] Adresse ist auf allen geprüften Seiten sichtbar.
- [x] Impressum-Link ist klickbar.
- [x] Datenschutz-Link ist klickbar.
- [x] Öffentliche Media-Pfad-Fixes für Startseite und Residents-Seite wurden anschließend erfolgreich im Browser gegengeprüft.
- [x] Öffentliche Resident-Releases-Seite wurde nachträglich mit SEO-/Social-/Footer-Basics und Media-Pfad-Normalisierung ergänzt.
- [x] `404.html` ist als eigene Fehlerseite vorhanden und auf `noindex,follow` gesetzt.
- [x] `favicon.svg` ist vorhanden und auf den kurzen statischen Seiten verlinkt.

## Kontext der behobenen Fehler

Vor dem bestandenen Test wurden folgende Probleme gefunden und gefixt:

- Startseite lud Resident-Slideshow-Bilder teilweise als `[object Object]`.
- Startseite nutzte für Resident-Slideshow nur `photos` statt die gleiche Priorität wie die Künstlerseite.
- Startseite normalisiert Resident-Media-Pfade jetzt für GitHub Pages.
- Residents-Seite normalisiert Release-/Media-Pfade jetzt für GitHub Pages.
- Resident-Releases-Seite normalisiert Artist- und Release-Media-Pfade jetzt ebenfalls für GitHub Pages.
- Mehrere öffentliche Seiten hatten noch kein Favicon.

## Noch offen trotz bestandenem Smoke-Test

Der Test ersetzt keine vollständige Go-Live-Prüfung. Weiterhin offen bleiben insbesondere:

- finale rechtliche Prüfung von Impressum und Datenschutz
- vollständiger SEO-Audit
- STAGING/LIVE-Deployment
- GitHub Actions / Deployment-Automation
- Tracking-Konzept und Tracking-Implementierung
- CSV-Import für Events
- UI-Finalcheck auf mehreren Viewports
- Accessibility- und Performance-Tests
- Entscheidung, wann der sichtbare Test-Badge wieder entfernt wird
- Favicon-Verlinkung auf den langen dynamischen Seiten `index.html`, `residents.html` und `resident-releases.html`
- `feedback-thanks.html` aus der LIVE-Sitemap-Vorlage entfernen, falls es dort weiterhin gelistet ist
- PNG/JPG-Version des Social-Preview-Bilds für maximale Social-Preview-Kompatibilität prüfen
