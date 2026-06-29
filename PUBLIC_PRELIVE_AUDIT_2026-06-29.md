# Public Pre-Live Audit – 2026-06-29

Status: Repo-Prüfung nach manuellen Public-Meta-Patches.

## Geprüfte Dateien

- `index.html`
- `residents.html`
- `resident-releases.html`
- `sitemap.xml`

## Ergebnis

- [x] `index.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `residents.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `resident-releases.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `resident-releases.html` ist in der aktiven `sitemap.xml` enthalten.
- [x] Der sichtbare `TEST BUILD / public-media-fix-4`-Badge ist im Repo nicht mehr auffindbar.
- [x] `residents.html` springt nach Footer/Wrapper direkt in das Script, ohne Test-Badge-Zwischenblock.
- [x] `resident-releases.html` springt nach Footer/Wrapper direkt in das Script, ohne Test-Badge-Zwischenblock.

## Noch vor LIVE im Browser zu prüfen

- `https://teuberleipzig-cpu.github.io/Tille/`
- `https://teuberleipzig-cpu.github.io/Tille/residents.html`
- `https://teuberleipzig-cpu.github.io/Tille/resident-releases.html`
- `https://teuberleipzig-cpu.github.io/Tille/favicon.svg`
- `https://teuberleipzig-cpu.github.io/Tille/site.webmanifest`
- `https://teuberleipzig-cpu.github.io/Tille/sitemap.xml`

Dabei prüfen:

- keine sichtbaren Test-Badges
- Seiten laden normal
- keine offensichtlichen Layout-Brüche
- Favicon, Manifest und Sitemap öffnen ohne 404

## Weiterhin offene Go-Live-Punkte

- finale rechtliche Prüfung von Impressum und Datenschutz
- STAGING/LIVE-Serverdaten und Zielpfade
- HTTPS und Redirect-Strategie
- LIVE-Smoke-Test nach echtem Deployment
- Social-Preview-PNG/JPG-Kompatibilität prüfen
- Tracking-Konzept final entscheiden
- Admin V2 und Resi-Admin auf STAGING/LIVE testen
