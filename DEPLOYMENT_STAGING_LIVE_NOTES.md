# Distillery Website – STAGING / LIVE Deployment Notes

Status: Dokumentation der bekannten Deployment-Architektur. Diese Datei aktiviert kein Deployment und enthält keine Zugangsdaten.

## Zielumgebungen

### STAGING (aktiv)

- Domain: `https://www-test.distillery.de/`
- HTTPS und `/healthz` funktionieren.
- Auslieferung: statische Website in Docker/nginx über GHCR.
- `.github/workflows/docker-publish.yml` baut bei Push auf `main` ausdrücklich mit `DEPLOY_TARGET=staging`.
- Das Image wird als `ghcr.io/teuberleipzig-cpu/tille:latest` veröffentlicht und über den SSH Forced Deployment Account `deploy-www-test-distillery` auf `vps03.itlej.de` mit `/usr/local/sbin/deploy-www-test-distillery.sh` neu geladen.
- Der Staging-Build liefert `robots.staging.txt` als `/robots.txt`, entfernt die LIVE-Sitemap und setzt `X-Robots-Tag: noindex, nofollow, noarchive` auf öffentlichen Antworten.
- Basic Auth ist als zusätzliche serverseitige Härtung weiterhin offen. Zugangsdaten gehören ausschließlich in Serverkonfiguration oder Secrets, niemals ins Repository.

`teuberstaging.distillery.de` ist nicht die aktive Staging-Zielumgebung.

### LIVE (später)

- Ziel-Domain: `https://www.distillery.de/`
- Ein normaler Docker-Build ohne `DEPLOY_TARGET` bleibt der LIVE-sichere Default: normale `robots.txt`, vorhandene `sitemap.xml` und kein Noindex-Header.
- Die aktiven Root-Dateien und Templates `robots.live.txt` sowie `sitemap.live.xml` bleiben für LIVE erhalten.

## Trennung der Builds

| Build | robots.txt | sitemap.xml | X-Robots-Tag |
| --- | --- | --- | --- |
| `DEPLOY_TARGET=staging` | `Disallow: /` aus `robots.staging.txt` | nicht ausgeliefert | `noindex, nofollow, noarchive` |
| Default / `DEPLOY_TARGET=live` | vorhandene LIVE-Datei mit `Allow: /` | vorhanden | kein Noindex |

Der Tag `latest` ist im aktuellen Workflow ausdrücklich ein STAGING-Image und wird vom bestehenden www-test-Deployment verwendet. Ein späteres LIVE-Deployment darf diesen Workflow oder Tag nicht ungeprüft wiederverwenden; dafür ist eine getrennte LIVE-Strategie erforderlich.

## Bekannte Infrastruktur

- Docker mit `nginxinc/nginx-unprivileged:alpine`
- GitHub Actions und GHCR
- Multi-Arch-Image für amd64 und arm64
- Host `vps03.itlej.de`
- SSH Forced Deployment Account `deploy-www-test-distillery`
- Forced Script `/usr/local/sbin/deploy-www-test-distillery.sh`
- Reverse Proxy/TLS vor Containerport 8080

Keine SSH-Schlüssel, Tokens, Passwörter oder sonstigen Secrets werden in dieser Dokumentation festgehalten.

## Offene Punkte

- Basic Auth am Reverse Proxy als zusätzliche Staging-Härtung prüfen.
- Rollback des serverseitigen Deployments dokumentieren und testen.
- Getrennten LIVE-Workflow, LIVE-Tag und Freigabeprozess definieren.
- LIVE-Redirects, Zertifikate und Serverlog-/Datenschutzanforderungen final prüfen.

## Prüfcheckliste

### STAGING

- [x] Aktive Domain und HTTPS bekannt.
- [x] `/healthz` vorhanden.
- [x] Staging-spezifischer Docker-Build definiert.
- [x] `robots.txt` sperrt Crawler.
- [x] `X-Robots-Tag` wird durch nginx gesetzt.
- [x] LIVE-Sitemap wird nicht ausgeliefert.
- [ ] Basic Auth optional serverseitig ergänzen.
- [ ] Rollback serverseitig dokumentieren und testen.

### LIVE

- [x] LIVE-robots- und Sitemap-Dateien vorbereitet.
- [x] Default-Docker-Build bleibt frei von Noindex.
- [ ] Getrennte Deployment- und Tag-Strategie festlegen.
- [ ] HTTPS, Redirects, Rollback und Smoke-Tests finalisieren.
- [ ] Rechtliche Seiten final prüfen.
- [ ] Datenschutz für Tracking, Serverlogs und Formulare final prüfen.
- [ ] P0/P1-Go-Live-Checklisten abschließen.

## Deployment-Grundsätze

1. Änderungen werden im GitHub-Repository committed und über Pull Requests geprüft.
2. Der bestehende Workflow deployt ausschließlich die aktive STAGING-Umgebung.
3. LIVE wird erst nach einer getrennten Strategie und expliziten Freigabe deployt.
4. Server-Zugangsdaten liegen ausschließlich in GitHub Secrets.
5. Deploy-Logs dürfen keine Secrets ausgeben.
6. Rollback muss dokumentiert und getestet sein.

## Öffentliche Deployment-Dateien

Neben den Robots- und Sitemap-Dateien bleiben `favicon.svg`, `site.webmanifest`,
`.well-known/security.txt` und `404.html` Bestandteil der Website. Produktive Events,
Residents und Medien werden als statische Inhalte aus dem jeweiligen Image ausgeliefert.
