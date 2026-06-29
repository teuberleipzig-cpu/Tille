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
- `/news.html`
- `/about.html`
- `/contact.html`
- `/history.html`
- `/feedback.html`
- `/impressum.html`
- `/datenschutz.html`

## Ergebnis

- [x] Keine relevanten Console-Fehler mehr gemeldet.
- [x] Keine relevanten Media-404-Fehler mehr gemeldet.
- [x] Impressum ist auf allen geprüften Seiten sichtbar.
- [x] Datenschutz ist auf allen geprüften Seiten sichtbar.
- [x] Adresse ist auf allen geprüften Seiten sichtbar.
- [x] Impressum-Link ist klickbar.
- [x] Datenschutz-Link ist klickbar.
- [x] Öffentliche Media-Pfad-Fixes für Startseite und Residents-Seite wurden anschließend erfolgreich im Browser gegengeprüft.

## Kontext der behobenen Fehler

Vor dem bestandenen Test wurden folgende Probleme gefunden und gefixt:

- Startseite lud Resident-Slideshow-Bilder teilweise als `[object Object]`.
- Startseite nutzte für Resident-Slideshow nur `photos` statt die gleiche Priorität wie die Künstlerseite.
- Startseite normalisiert Resident-Media-Pfade jetzt für GitHub Pages.
- Residents-Seite normalisiert Release-/Media-Pfade jetzt für GitHub Pages.

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
