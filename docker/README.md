# Docker-Setup der Distillery-Website

Die statische Website läuft in `nginxinc/nginx-unprivileged:alpine`. Der gemeinsame Dockerfile unterstützt einen LIVE-sicheren Default und einen ausdrücklich aktivierten Staging-Modus.

## Dateien

| Datei | Zweck |
| --- | --- |
| `Dockerfile` | gemeinsames nginx-Image mit `DEPLOY_TARGET` |
| `nginx.conf` | Default-/LIVE-Konfiguration |
| `nginx.staging.conf` | Staging-Konfiguration mit `X-Robots-Tag` |
| `Dockerfile.dockerignore` | begrenzt den Build-Kontext |
| `../.github/workflows/docker-publish.yml` | baut, veröffentlicht und deployt das STAGING-Image |

## Lokal bauen und starten

Der Build-Kontext ist immer das Repository-Root.

Default / LIVE-Safety:

```bash
docker build -f docker/Dockerfile -t tille-default .
docker run --rm -p 8080:8080 tille-default
```

STAGING:

```bash
docker build --build-arg DEPLOY_TARGET=staging -f docker/Dockerfile -t tille-staging .
docker run --rm -p 8081:8080 tille-staging
```

Der Container läuft als Benutzer `nginx` (UID 101) auf Port 8080. TLS wird vom vorgeschalteten Reverse Proxy terminiert. `/healthz` liefert `200 ok`.

## Verhalten der Buildmodi

| Verhalten | Default / `live` | `staging` |
| --- | --- | --- |
| `/robots.txt` | vorhandene LIVE-Datei mit `Allow: /` | Kopie von `robots.staging.txt` mit `Disallow: /` |
| `/sitemap.xml` | vorhanden | entfernt / 404 |
| `X-Robots-Tag` | kein Noindex | `noindex, nofollow, noarchive` |

Ein unbekannter `DEPLOY_TARGET` lässt den Build fehlschlagen. Dadurch kann ein Tippfehler nicht still einen falschen Modus erzeugen.

## nginx-Verhalten

Beide Konfigurationen erhalten:

- Custom 404 aus `404.html`
- JSON mit `Cache-Control: no-store`
- HTML, CSS und JavaScript mit `Cache-Control: no-cache`
- Medien mit `Cache-Control: public, max-age=2592000`
- korrekten Manifest-MIME-Type
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- gzip und `/healthz`

Die Staging-Konfiguration setzt `X-Robots-Tag: noindex, nofollow, noarchive` auch ausdrücklich in allen Locations mit eigenen `add_header`-Direktiven. So geht der Header durch die nginx-Vererbungsregeln nicht verloren.

## Build-Kontext und Webroot

`Dockerfile.dockerignore` hält Repository-Interna, Dokumentation, Skripte, Reports und LIVE-Templates aus dem Image. `robots.staging.txt` und beide nginx-Konfigurationen sind gezielt für den Build verfügbar. Der Dockerfile entfernt anschließend `robots.staging.txt`, temporäre Konfigurationen und `docker/` aus dem ausgelieferten Webroot.

## GitHub Actions, GHCR und www-test

`.github/workflows/docker-publish.yml` läuft bei Push auf `main` sowie manuell. Er baut Multi-Arch für amd64 und arm64 ausdrücklich mit `DEPLOY_TARGET=staging` und veröffentlicht:

- `ghcr.io/teuberleipzig-cpu/tille:latest`
- einen unveränderlichen SHA-Tag

`latest` ist damit im aktuellen Workflow ausdrücklich das STAGING-Image für `https://www-test.distillery.de/`. Ein späteres LIVE-Deployment darf diesen Workflow oder Tag nicht ungeprüft wiederverwenden und benötigt eine getrennte LIVE-Strategie.

Der Deploy-Job verbindet sich mit dem SSH Forced Deployment Account `deploy-www-test-distillery` auf `vps03.itlej.de`; serverseitig läuft `/usr/local/sbin/deploy-www-test-distillery.sh`. Zugangsdaten bleiben in GitHub Secrets.

Basic Auth bleibt eine optionale zusätzliche Härtung am Reverse Proxy. Es werden keine festen Zugangsdaten in das Repository aufgenommen.

Das Multi-Arch-Image enthält amd64 und arm64 unter derselben Manifest-Liste. Docker
zieht auf dem Server automatisch die passende Architektur; der arm64-Build läuft in
GitHub Actions über QEMU und kann deshalb länger dauern.

## PR-Smoke-Test

`.github/workflows/staging-container-smoke.yml` baut bei relevanten Pull Requests beide
Varianten ausschließlich lokal auf dem GitHub Runner. Der Workflow startet Container,
führt `nginx -t` und die HTTP-/Header-Matrix aus und räumt die Container anschließend
auf. Er meldet sich nicht bei GHCR an, pusht kein Image, verwendet kein SSH und löst
kein Deployment aus.

## Inhaltsauslieferung

Die öffentlichen Seiten lesen Events über `public/events/data/manifest.json` und
die Monatsdateien unter `public/events/data/months/`. Residents kommen weiterhin
aus `public/residents/data/residents.json` im Image, nicht direkt von GitHub. Der
bestehende STAGING-Weg ist daher: Admin-Commit auf `main`, Image-Build, serverseitiger
Pull und Container-Reload. Für LIVE muss dieser Ablauf getrennt definiert werden.

## Rollback-Hinweis

Die CI veröffentlicht zusätzlich zum beweglichen Tag `latest` einen unveränderlichen
SHA-Tag. Ein serverseitiger Rollback kann ein früheres SHA-Image verwenden, muss aber
mit dem Forced Deployment Script abgestimmt und separat getestet werden. Ein späterer
Push auf `main` erzeugt erneut ein aktuelles STAGING-Image.

## Content Security Policy

Es ist weiterhin keine CSP gesetzt. Die Website verwendet externe Ziele, unter anderem
`formsubmit.co` und `api.github.com`. Eine CSP muss diese Abhängigkeiten ausdrücklich
berücksichtigen und vor Aktivierung getestet werden.
