# STAGING / LIVE Server Information

Diese Datei trennt bekannte Infrastruktur von noch offenen Punkten. Sie enthält keine Zugangsdaten.

## STAGING – bekannt

- Aktive Domain: `https://www-test.distillery.de/`
- HTTPS funktioniert.
- `/healthz` liefert `200 ok`.
- Anwendung: statische Website in Docker/nginx.
- Registry/CI: GHCR und GitHub Actions.
- Host: `vps03.itlej.de`.
- Deployment-Konto: SSH Forced Deployment Account `deploy-www-test-distillery`.
- Erzwungenes Deployment-Script: `/usr/local/sbin/deploy-www-test-distillery.sh`.
- Image: `ghcr.io/teuberleipzig-cpu/tille:latest`; der aktuelle Workflow baut diesen Tag ausdrücklich als STAGING-Image.
- Indexierungsschutz im Image: Staging-robots-Datei plus `X-Robots-Tag: noindex, nofollow, noarchive`.

`teuberstaging.distillery.de` ist nicht die aktive Staging-Umgebung.

## STAGING – offen

- [ ] Basic Auth optional am Reverse Proxy ergänzen, ohne Zugangsdaten im Repository abzulegen.
- [ ] Serverseitigen Rollback-Ablauf dokumentieren und testen.
- [ ] Monitoring und Aufbewahrung der Serverlogs klären.

## LIVE – offen

- [ ] Separaten LIVE-Workflow und vom Staging-Tag getrennte Tag-Strategie definieren.
- [ ] LIVE-Zielhost und Deployment-Methode final bestätigen.
- [ ] Entscheiden, ob `www.distillery.de` die Hauptdomain bleibt.
- [ ] Redirect von `distillery.de` zu `www.distillery.de` oder umgekehrt festlegen.
- [ ] HTTPS-Zertifikat, Rollback und Smoke-Test festlegen.
- [ ] Prüfen, ob alte URLs weitergeleitet werden müssen.
- [ ] Serverlog- und Datenschutzanforderungen klären.

## Deployment-Dateien

Für LIVE vorbereitet:

- aktive `robots.txt` und `sitemap.xml`
- `robots.live.txt` und `sitemap.live.xml` als zusätzliche Vorlagen
- `favicon.svg`, `site.webmanifest`, `.well-known/security.txt` und `404.html`

Für STAGING vorbereitet:

- `robots.staging.txt` als Source of Truth für `/robots.txt`
- `docker/nginx.staging.conf` für den HTTP-Header-Schutz
- `DEPLOY_TARGET=staging` im aktiven www-test-Workflow

Secrets, SSH-Schlüssel, Tokens und Passwörter bleiben außerhalb des Repositorys.

## Weiterhin zu klären

- LIVE-Zielpfad und getrennte LIVE-Deployment-Methode
- Redirect-Strategie und Weiterleitungen alter URLs
- Serverseitige Rollback-Methode
- Verfügbarkeit und Aufbewahrungsdauer von Serverlogs
