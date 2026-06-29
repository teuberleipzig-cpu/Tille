# Public Site Smoke Test

Status: bestanden auf GitHub-Pages-Testumgebung, aber nach späterem Repo-Check mit offenem `index.html`-Badge-Korrekturpunkt.
Datum: 2026-06-29.
Testergebnis: manuell durch Browser-Test bestätigt und anschließend im Repo nachgezogen; später wurde per direkter Datei-Prüfung festgestellt, dass der Test-Badge in `index.html` noch offen ist.

## Getestete Umgebung

- GitHub Pages: `https://teuberleipzig-cpu.github.io/Tille/`
- Test-Badge: `residents.html` und `resident-releases.html` sind im geprüften Bereich sauber; `index.html` enthält den Badge noch und ist in `MANUAL_TOMORROW_QUEUE.md` dokumentiert.

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
- [x] `favicon.svg` ist vorhanden und auf den öffentlichen Seiten verlinkt.
- [x] `site.webmanifest` ist auf den öffentlichen Seiten verlinkt.
- [x] `index.html`, `residents.html`, `resident-releases.html` und `feedback.html` haben Favicon-, Manifest- und Theme-Color-Meta im Repo.
- [x] `feedback.html`, `favicon.svg` und `site.webmanifest` wurden nach Deployment direkt im Browser ohne Fehler geöffnet.
- [ ] Sichtbarer `TEST BUILD / public-media-fix-4`-Badge ist noch nicht vollständig aus dem Repo entfernt: `index.html` bleibt offen.

## Kontext der behobenen Fehler

Vor dem bestandenen Test wurden folgende Probleme gefunden und gefixt:

- Startseite lud Resident-Slideshow-Bilder teilweise als `[object Object]`.
- Startseite nutzte für Resident-Slideshow nur `photos` statt die gleiche Priorität wie die Künstlerseite.
- Startseite normalisiert Resident-Media-Pfade jetzt für GitHub Pages.
- Residents-Seite normalisiert Release-/Media-Pfade jetzt für GitHub Pages.
- Resident-Releases-Seite normalisiert Artist- und Release-Media-Pfade jetzt ebenfalls für GitHub Pages.
- Mehrere öffentliche Seiten hatten noch kein Favicon/Manifest/Theme-Color.
- Sichtbarer Test-Badge wurde auf `residents.html` und `resident-releases.html` entfernt; `index.html` bleibt als manueller Patch offen.

## Noch offen trotz bestandenem Smoke-Test

Der Test ersetzt keine vollständige Go-Live-Prüfung. Weiterhin offen bleiben insbesondere:

- manueller Patch: `index.html` Test-Badge entfernen
- erneuter Browser-Smoke-Test nach dem letzten Deploy ohne Test-Badge
- finale rechtliche Prüfung von Impressum und Datenschutz
- vollständiger SEO-Audit
- STAGING/LIVE-Deployment
- GitHub Actions / Deployment-Automation
- Tracking-Konzept und Tracking-Implementierung
- CSV-Import für Events
- UI-Finalcheck auf mehreren Viewports
- Accessibility- und Performance-Tests
- PNG/JPG-Version des Social-Preview-Bilds für maximale Social-Preview-Kompatibilität prüfen
