# Deployment Readiness Audit – 2026-06-29

Status: Repo-basierter Audit. Kein Serverzugriff, kein STAGING-Deployment, kein LIVE-Deployment, keine Zugangsdaten.

## Geprüfte Dateien

- `DEPLOYMENT_STAGING_LIVE_NOTES.md`
- `STAGING_LIVE_SERVER_INFO_NEEDED.md`
- `POST_DEPLOY_BROWSER_CHECK.md`
- `PUBLIC_PRELIVE_AUDIT_2026-06-29.md`
- `GO_LIVE_REMAINING_CHECKLIST.md`

## Bereits vorbereitet

- [x] Geplante LIVE-Domain ist dokumentiert.
- [x] Geplante STAGING-Domain ist dokumentiert.
- [x] Aktive `robots.txt` ist für LIVE-Zielcanonical vorbereitet.
- [x] Aktive `sitemap.xml` ist für LIVE-Zielcanonical vorbereitet.
- [x] `robots.live.txt` ist als zusätzliche LIVE-Vorlage vorhanden.
- [x] `robots.staging.txt` ist als STAGING-Vorlage vorhanden.
- [x] `sitemap.live.xml` ist als zusätzliche LIVE-Sitemap-Vorlage vorhanden.
- [x] `favicon.svg`, `site.webmanifest`, `404.html` und `.well-known/security.txt` sind als Deployment-Dateien dokumentiert.
- [x] Post-Deploy-Browser-Checkliste ist vorhanden.
- [x] Es ist dokumentiert, dass STAGING zusätzlich zu `robots.txt` besser über Basic Auth oder Header geschützt werden sollte.
- [x] Es ist dokumentiert, dass Secrets nicht ins Repo gehören.

## Noch nicht bereit / Blocker

- [ ] Server-/Hosting-Anbieter ist nicht bekannt.
- [ ] Servertyp ist nicht bekannt.
- [ ] LIVE-Zielpfad ist nicht bekannt.
- [ ] STAGING-Zielpfad ist nicht bekannt.
- [ ] Deployment-Methode ist nicht final: manuell, SFTP, SSH, Panel, GitHub Actions oder anderer Weg.
- [ ] HTTPS für STAGING ist nicht bestätigt.
- [ ] HTTPS für LIVE ist nicht bestätigt.
- [ ] Redirect-Strategie ist nicht final entschieden.
- [ ] STAGING-Zugriffsschutz ist nicht technisch eingerichtet.
- [ ] Serverlogs und Aufbewahrung sind nicht geklärt.
- [ ] Rollback-Methode ist nicht definiert.
- [ ] GitHub-Actions-Deployment ist noch nicht eingerichtet.
- [ ] LIVE-Smoke-Test kann erst nach echtem Deployment erfolgen.
- [ ] Admin V2 und Resi-Admin können erst nach STAGING/LIVE-Zugang final getestet werden.

## Readiness-Einschätzung

### Repo-Vorbereitung

Die Repo-seitige Vorbereitung für öffentliche Dateien, Meta, Sitemap, Robots, Utility-Seiten und Checklisten ist weitgehend vorhanden.

### Deployment-Fähigkeit

Das echte Deployment ist noch nicht umsetzbar, weil Serverzugang, Zielpfade, HTTPS, Redirects, STAGING-Schutz und Rollback noch nicht bekannt sind.

### Nächster sauberer Schritt

Server-/Hostingdaten aus `STAGING_LIVE_SERVER_INFO_NEEDED.md` beschaffen. Erst danach kann zuverlässig entschieden werden, ob Deployment manuell, per Panel, per SFTP/SSH oder per GitHub Actions eingerichtet wird.

## Nicht anfassen bis Serverdaten bekannt sind

- Keine GitHub Secrets anlegen.
- Keine Deployment-Workflow-Datei mit geratenen Zugangsdaten oder geratenem Zielpfad erstellen.
- Keine LIVE-Robots-/Sitemap-Platzierung für STAGING übernehmen.
- Keine STAGING-Indexierung nur über `robots.txt` als ausreichend behandeln.

## Fazit

Die Website ist repo-seitig gut vorbereitet, aber deployment-seitig noch blockiert. Der Blocker ist nicht Code, sondern fehlende Infrastrukturinformation.
