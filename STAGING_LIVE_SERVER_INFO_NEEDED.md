# STAGING / LIVE Server Info Needed

Diese Datei sammelt die konkreten Informationen, die vor einem echten STAGING-/LIVE-Deployment benötigt werden. Sie enthält keine Zugangsdaten.

## STAGING

Ziel-Domain:

- `teuberstaging.distillery.de`

Noch benötigt:

- [ ] Server-/Hosting-Anbieter benennen.
- [ ] Servertyp klären: statisches Hosting, Apache, Nginx, Plesk, Netlify, Firebase, GitHub Pages oder anderes.
- [ ] STAGING-Zielpfad für die Dateien klären.
- [ ] Klären, ob SSH/SFTP/Git-Deployment/Panel-Upload verwendet wird.
- [ ] HTTPS-Zertifikat für STAGING klären.
- [ ] Schutz gegen Indexierung klären: Basic Auth, `X-Robots-Tag`, noindex-Header oder mindestens `robots.staging.txt`.
- [ ] Prüfen, ob Custom 404 möglich ist.
- [ ] Prüfen, ob Redirect-Regeln möglich sind.
- [ ] Prüfen, ob Security-Headers möglich sind.

## LIVE

Ziel-Domain:

- `https://www.distillery.de/`

Noch benötigt:

- [ ] LIVE-Zielpfad für die Dateien klären.
- [ ] Entscheiden, ob `www.distillery.de` die Hauptdomain bleibt.
- [ ] Redirect von `distillery.de` zu `www.distillery.de` oder umgekehrt final entscheiden.
- [ ] HTTPS-Zertifikat für LIVE klären.
- [ ] Deployment-Methode klären: manuell, GitHub Actions, FTP/SFTP, Panel oder anderer Weg.
- [ ] Rollback-Methode klären.
- [ ] Prüfen, ob alte URLs weitergeleitet werden müssen.
- [ ] Prüfen, ob Serverlogs existieren und wie sie in der Datenschutzseite beschrieben werden müssen.

## Dateien für Deployment

Für LIVE vorbereitet:

- `robots.live.txt` als Vorlage für `/robots.txt`
- `sitemap.live.xml` als LIVE-Sitemap-Vorlage
- aktive `robots.txt`
- aktive `sitemap.xml`
- `favicon.svg`
- `site.webmanifest`
- `.well-known/security.txt`
- `404.html`

Für STAGING vorbereitet:

- `robots.staging.txt` als Vorlage für `/robots.txt`

## Blocker

Ohne Server-/Hosting-Informationen können die folgenden Punkte nicht zuverlässig abgeschlossen werden:

- echtes STAGING-Deployment
- echtes LIVE-Deployment
- HTTPS-Prüfung
- Redirect-Strategie
- Serverlog-/Datenschutzprüfung
- STAGING-Noindex über Header oder Basic Auth
- GitHub-Actions-Deployment
