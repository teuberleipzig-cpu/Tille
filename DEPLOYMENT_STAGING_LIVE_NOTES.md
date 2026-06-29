# Distillery Website – STAGING / LIVE Deployment Notes

Status: Arbeitsdokument für die Go-Live-Vorbereitung. Diese Datei aktiviert kein Deployment und enthält keine Zugangsdaten.

## Zielumgebungen

### LIVE

- Ziel-Domain: `https://www.distillery.de/`
- Zweck: öffentliche produktive Firmenwebsite der Distillery Leipzig.
- Produktive Daten: produktive Events, Residents, Medien und öffentliche Seiten.
- Indexierung: erst nach finalem Go-Live erlauben.
- Aktive Robots-Datei später: `robots.live.txt` als `/robots.txt` deployen/kopieren.
- Aktive Sitemap später: `sitemap.live.xml` als `/sitemap.xml` deployen/kopieren.

### STAGING

- Ziel-Domain: `https://teuberstaging.distillery.de/`
- Zweck: Testumgebung für Mainpage, Admin V2 und Resi-/Resident-Admins vor LIVE.
- Indexierung: darf nicht öffentlich über Suchmaschinen auffindbar sein.
- Aktive Robots-Datei später: `robots.staging.txt` als `/robots.txt` deployen/kopieren.
- Zusätzlicher Schutz nötig: `robots.txt` ist kein Zugriffsschutz. Sobald der Server bekannt ist, zusätzlich `X-Robots-Tag: noindex, nofollow` und/oder HTTP Basic Auth prüfen.

## Aktuelle Template-Dateien

| Datei | Zweck | Aktiv? |
| --- | --- | --- |
| `robots.live.txt` | Vorlage für LIVE `/robots.txt` | Nein |
| `robots.staging.txt` | Vorlage für STAGING `/robots.txt` | Nein |
| `sitemap.live.xml` | Vorlage für LIVE `/sitemap.xml` | Nein |

Wichtig: Es gibt bewusst noch keine aktive Root-`robots.txt` und keine aktive Root-`sitemap.xml`, damit GitHub Pages, STAGING und LIVE nicht versehentlich falsch gesteuert werden.

## Spätere GitHub-Actions-Zielarchitektur

Gewünscht ist eine Pipeline ähnlich `atf-domain`:

1. Änderungen werden im GitHub-Repository committed.
2. STAGING wird automatisch oder manuell aus einem definierten Branch deployt.
3. LIVE wird erst nach expliziter Freigabe deployt.
4. Server-Zugangsdaten liegen ausschließlich in GitHub Secrets.
5. Keine Secrets, Tokens, FTP-/SSH-Daten oder API-Keys im Repository.
6. Deploy-Logs dürfen keine Secrets ausgeben.
7. Rollback muss dokumentiert und getestet sein.

## Offene Serverfragen

Vor dem Einrichten echter Deployment-Actions müssen geklärt werden:

- Servertyp: klassisches Webhosting, VPS, Managed Hosting, Apache, Nginx oder anderes?
- Zugriff: SFTP, SSH, rsync, FTP oder Deployment-API?
- Zielpfad LIVE.
- Zielpfad STAGING.
- Ob STAGING eine eigene Document Root hat.
- Ob serverseitige Header gesetzt werden können.
- Ob Basic Auth für STAGING möglich ist.
- Ob `X-Robots-Tag` gesetzt werden kann.
- Ob HTTPS-Zertifikate für `distillery.de` und `teuberstaging.distillery.de` aktiv sind.
- Ob Redirects von non-www auf www oder umgekehrt gewünscht sind.
- Ob alte URLs weitergeleitet werden müssen.
- Ob serverseitige Logs verfügbar sind und wie lange sie gespeichert werden.

## Deployment-Checkliste vor STAGING

- [ ] Serverzugriff bekannt.
- [ ] STAGING-Zielpfad bekannt.
- [ ] STAGING-Subdomain zeigt auf korrekten Zielpfad.
- [ ] HTTPS für STAGING aktiv.
- [ ] `robots.staging.txt` als `/robots.txt` vorbereitet.
- [ ] `noindex`-Header oder Basic Auth für STAGING vorbereitet.
- [ ] Deploy ohne Secrets im Repo möglich.
- [ ] STAGING-Rollback definiert.
- [ ] STAGING-Smoke-Test definiert.

## Deployment-Checkliste vor LIVE

- [ ] LIVE-Zielpfad bekannt.
- [ ] LIVE-Domain zeigt auf korrekten Zielpfad.
- [ ] HTTPS für LIVE aktiv.
- [ ] Redirect-Strategie entschieden.
- [ ] `robots.live.txt` als `/robots.txt` vorbereitet.
- [ ] `sitemap.live.xml` als `/sitemap.xml` vorbereitet.
- [ ] LIVE-Rollback definiert.
- [ ] LIVE-Smoke-Test definiert.
- [ ] P0/P1-Go-Live-Checklisten erledigt.
- [ ] Rechtliche Seiten final geprüft.
- [ ] Datenschutz für Tracking, Serverlogs und Formulare final geprüft.

## Nicht in diesem Dokument enthalten

- keine Zugangsdaten
- keine GitHub Secrets
- keine Servernamen außer den geplanten öffentlichen Domains
- keine Admin-Tokens
- keine produktiven Datenänderungen
- keine Deployment-Workflows

## Aktueller nächster Schritt

Sobald Serverdetails bekannt sind, wird aus diesem Dokument abgeleitet:

- GitHub-Actions-Workflow für STAGING
- GitHub-Actions-Workflow oder manueller Freigabeprozess für LIVE
- serverabhängige `robots.txt`-/`sitemap.xml`-Platzierung
- STAGING-Noindex-/Basic-Auth-Strategie
- Rollback-Anleitung
