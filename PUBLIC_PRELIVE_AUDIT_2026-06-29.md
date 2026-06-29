# Public Pre-Live Audit – 2026-06-29

Status: Repo-Prüfung nach Public-Meta-Patches, Root-/Utility-Dateiprüfung, Link-/Head-/Asset-/Noindex-/External-Services-/Deployment-Readiness-/Media-Rights-/Tracking-Audits, Audit-Index und manueller Warteschlange.

## Geprüfte Dateien

- `index.html`
- `residents.html`
- `resident-releases.html`
- `feedback-thanks.html`
- `404.html`
- `robots.txt`
- `robots.live.txt`
- `robots.staging.txt`
- `sitemap.xml`
- `sitemap.live.xml`
- `favicon.svg`
- `site.webmanifest`
- `.well-known/security.txt`
- `MANUAL_TOMORROW_QUEUE.md`
- `INDEX_TEST_BADGE_MANUAL_PATCH.md`
- `PUBLIC_AUDIT_INDEX_2026-06-29.md`
- `PUBLIC_INTERNAL_LINK_AUDIT_2026-06-29.md`
- `PUBLIC_HEAD_META_AUDIT_2026-06-29.md`
- `PUBLIC_ASSET_AUDIT_2026-06-29.md`
- `PUBLIC_UTILITY_NO_INDEX_AUDIT_2026-06-29.md`
- `PUBLIC_EXTERNAL_SERVICES_PRIVACY_AUDIT_2026-06-29.md`
- `DEPLOYMENT_READINESS_AUDIT_2026-06-29.md`
- `MEDIA_RIGHTS_READINESS_AUDIT_2026-06-29.md`
- `TRACKING_READINESS_AUDIT_2026-06-29.md`

## Ergebnis

- [x] `index.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `residents.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `resident-releases.html` hat Canonical, Favicon, Manifest und Theme-Color im `<head>`.
- [x] `feedback-thanks.html` ist auf `noindex,follow` gesetzt und hat Favicon, Manifest und Theme-Color.
- [x] `404.html` ist auf `noindex,follow` gesetzt und hat Favicon, Manifest und Theme-Color.
- [x] `resident-releases.html` ist in der aktiven `sitemap.xml` enthalten.
- [x] `feedback-thanks.html` ist weder in der aktiven `sitemap.xml` noch in `sitemap.live.xml` enthalten.
- [x] `resident-releases.html` ist in `sitemap.live.xml` enthalten.
- [x] `robots.txt` erlaubt Crawling und verweist auf die aktive Sitemap.
- [x] `robots.live.txt` ist als LIVE-Vorlage vorhanden.
- [x] `robots.staging.txt` ist als STAGING-Vorlage vorhanden und blockt Crawling.
- [x] `favicon.svg` ist vorhanden und valide als SVG-Favicon vorbereitet.
- [x] `site.webmanifest` ist vorhanden und verweist auf `favicon.svg`.
- [x] `.well-known/security.txt` ist vorhanden und verweist auf `club@distillery.de`.
- [x] Repo-basierter Audit-Index ist dokumentiert.
- [x] Repo-basierter interner Public-Link-Audit ist dokumentiert.
- [x] Repo-basierter Head-/Meta-Audit ist dokumentiert.
- [x] Repo-basierter Asset-Audit ist dokumentiert.
- [x] Repo-basierter Utility-/Noindex-Audit ist dokumentiert.
- [x] Repo-basierter External-Services-/Privacy-Audit ist dokumentiert.
- [x] Repo-basierter Deployment-Readiness-Audit ist dokumentiert.
- [x] Repo-basierter Media-/Rights-Readiness-Audit ist dokumentiert.
- [x] Repo-basierter Tracking-Readiness-Audit ist dokumentiert.
- [x] `residents.html` springt nach Footer/Wrapper direkt in das Script, ohne Test-Badge-Zwischenblock.
- [x] `resident-releases.html` springt nach Footer/Wrapper direkt in das Script, ohne Test-Badge-Zwischenblock.
- [ ] `index.html` enthält den sichtbaren `TEST BUILD / public-media-fix-4`-Badge noch. Der manuelle Patch ist in `MANUAL_TOMORROW_QUEUE.md` und `INDEX_TEST_BADGE_MANUAL_PATCH.md` dokumentiert.

## Noch vor LIVE im Browser zu prüfen

- `https://teuberleipzig-cpu.github.io/Tille/`
- `https://teuberleipzig-cpu.github.io/Tille/residents.html`
- `https://teuberleipzig-cpu.github.io/Tille/resident-releases.html`
- `https://teuberleipzig-cpu.github.io/Tille/favicon.svg`
- `https://teuberleipzig-cpu.github.io/Tille/site.webmanifest`
- `https://teuberleipzig-cpu.github.io/Tille/sitemap.xml`
- `https://teuberleipzig-cpu.github.io/Tille/404.html`
- `https://teuberleipzig-cpu.github.io/Tille/feedback-thanks.html`
- `https://teuberleipzig-cpu.github.io/Tille/.well-known/security.txt`

Dabei prüfen:

- nach manuellem `index.html`-Patch keine sichtbaren Test-Badges
- Seiten laden normal
- keine offensichtlichen Layout-Brüche
- Favicon, Manifest, Sitemap und Security-Datei öffnen ohne 404
- `404.html` und `feedback-thanks.html` sind visuell erreichbar, aber technisch auf `noindex,follow` gesetzt
- öffentliche Medien laden ohne sichtbare 404s
- keine unerwarteten Tracking-/Analytics-Requests im Network-Panel

## Weiterhin offene Go-Live-Punkte

- manueller Patch: Test-Badge aus `index.html` entfernen
- Browser-Klicktest nach dem letzten Deploy
- finale rechtliche Prüfung von Impressum und Datenschutz
- Feedback-Formular-Dienst, Zieladresse und Weiterleitung final entscheiden
- STAGING/LIVE-Serverdaten und Zielpfade
- HTTPS und Redirect-Strategie
- LIVE-Smoke-Test nach echtem Deployment
- Deployment-Methode und Rollback final klären
- Bild-/Medienrechte final bestätigen
- Social-Preview-PNG/JPG-Kompatibilität prüfen
- Tracking-Konzept final entscheiden oder Tracking vorerst deaktiviert lassen
- Admin V2 und Resi-Admin auf STAGING/LIVE testen
