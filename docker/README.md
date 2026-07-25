# Docker-Setup der Distillery-Website

Die Website ist rein statisch. Das Image kopiert die Dateien unveraendert in einen
nginx-Container, es gibt keinen Build-Schritt.

## Dateien

| Datei | Zweck |
| --- | --- |
| `Dockerfile` | nginx-Image, Basis `nginxinc/nginx-unprivileged:alpine` |
| `nginx.conf` | Server-Konfiguration, landet als `/etc/nginx/conf.d/default.conf` |
| `Dockerfile.dockerignore` | steuert, was in das Image kommt |
| `../.github/workflows/docker-publish.yml` | baut und pusht das Image nach GHCR |

## Lokal bauen und starten

Der Build-Kontext ist immer das **Repo-Root**, nicht dieses Verzeichnis:

```bash
docker build -f docker/Dockerfile -t tille .
docker run --rm -p 8080:8080 tille
```

Danach `http://localhost:8080` aufrufen. Healthcheck: `curl http://localhost:8080/healthz`.

Der Container laeuft als Benutzer `nginx` (UID 101) und lauscht auf **Port 8080**.
Er terminiert kein TLS. Auf dem Server gehoert ein Reverse Proxy davor, der 80/443
auf 8080 mappt und die Zertifikate haelt.

## Was nicht im Image landet

`Dockerfile.dockerignore` haelt Repo-Interna aus dem ausgelieferten Verzeichnis heraus:
`.git`, `.github`, `docs/`, `scripts/`, `reports/`, alle `*.md`, die
`structure-*-checkpoint.txt` des Admins, das Verzeichnis `docker/` selbst sowie die
Vorlagen `robots.live.txt`, `robots.staging.txt` und `sitemap.live.xml`.

Ausgeliefert werden die aktiven Root-Dateien `robots.txt` und `sitemap.xml`, alle
HTML-Seiten, `assets/`, `public/` inklusive Admin und Resident-Portal sowie
`.well-known/security.txt`.

Wichtig: BuildKit sucht die Ignore-Datei unter `<Dockerfile-Pfad>.dockerignore`.
Deshalb heisst sie `docker/Dockerfile.dockerignore`. Ein Build mit `DOCKER_BUILDKIT=0`
wuerde sie ignorieren und die Doku mit ausliefern. BuildKit ist in aktuellen
Docker-Versionen und in GitHub Actions Standard.

## Verhalten der nginx-Konfiguration

- Custom 404 aus `404.html`.
- `*.json` mit `Cache-Control: no-store`. Wichtig, damit `events.json` und
  `residents.json` nie veraltet ausgeliefert werden.
- HTML, CSS und JS mit `no-cache`, also immer revalidieren. Ein Deploy ist damit
  sofort sichtbar.
- Bilder, Fonts und Videos mit `public, max-age=2592000` (30 Tage).
- `site.webmanifest` bekommt `application/manifest+json`, da der Typ in der
  Standard-`mime.types` von nginx fehlt.
- Gesetzte Header: `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`.
- `/healthz` liefert `200 ok` fuer Healthchecks.

Keine Content-Security-Policy gesetzt. Die Seite laedt bewusst externe Ziele
(`formsubmit.co` im Feedback-Formular, `api.github.com` in Admin und Resident-Portal).
Eine CSP muesste diese Ziele explizit erlauben und vorher getestet werden.

## GitHub Actions und GHCR

`.github/workflows/docker-publish.yml` laeuft bei jedem Push auf `main` (ausser reinen
Aenderungen an `*.md`, `docs/` oder `reports/`) und ist zusaetzlich manuell startbar.

Er baut das Image und pusht es nach `ghcr.io/teuberleipzig-cpu/tille` mit zwei Tags:

- `latest` – der jeweils aktuelle Stand von `main`
- `sha-<commit>` – unveraenderlich, der Handgriff fuer Rollbacks

Authentifiziert wird mit dem eingebauten `GITHUB_TOKEN`, es sind keine zusaetzlichen
Secrets noetig.

## Deployment per Watchtower

Auf dem Server:

- Watchtower muss den Tag `latest` beobachten.
- Das GHCR-Package ist zunaechst **privat**. Entweder die Package-Sichtbarkeit auf
  public stellen oder Watchtower Zugangsdaten geben (`REPO_USER` und `REPO_PASS` mit
  einem PAT mit `read:packages`).
- Reverse Proxy auf Containerport 8080.

### Aktualisierung von Inhalten

Die oeffentlichen Seiten lesen `public/events/data/events.json` und
`public/residents/data/residents.json` als statische Dateien aus dem Image, nicht
direkt von GitHub. Der Weg einer Inhaltsaenderung ist deshalb:

Admin speichert -> Commit auf `main` -> Actions baut neues `latest` -> Watchtower zieht
das Image -> Seite zeigt die Aenderung.

Die Verzoegerung ist Build (rund eine Minute) plus Watchtower-Intervall.

### Rollback

```bash
docker pull ghcr.io/teuberleipzig-cpu/tille:sha-<alter-commit>
docker tag  ghcr.io/teuberleipzig-cpu/tille:sha-<alter-commit> ghcr.io/teuberleipzig-cpu/tille:latest
```

Container mit dem alten Tag neu starten. Watchtower ueberschreibt das beim naechsten
Push auf `main` wieder, ein Rollback braucht also zusaetzlich einen Fix oder Revert
im Repository.

## STAGING

Fuer `teuberstaging.distillery.de` ist dieses Image noch nicht vorbereitet. Noetig waeren
dort zusaetzlich `robots.staging.txt` als `/robots.txt`, ein `X-Robots-Tag: noindex`
und Basic Auth am Reverse Proxy. Details in `../DEPLOYMENT_STAGING_LIVE_NOTES.md`.
