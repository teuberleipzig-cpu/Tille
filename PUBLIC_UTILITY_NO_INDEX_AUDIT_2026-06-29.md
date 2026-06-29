# Public Utility / Noindex Audit – 2026-06-29

Status: Repo-basierter Audit. Kein Browser-Test, kein LIVE-Test.

## Geprüfte Dateien

- `404.html`
- `feedback-thanks.html`
- `robots.txt`
- `robots.live.txt`
- `robots.staging.txt`
- `sitemap.xml`
- `sitemap.live.xml`
- `.well-known/security.txt`

## Ergebnis Utility Pages

- [x] `404.html` ist vorhanden.
- [x] `404.html` ist auf `noindex,follow` gesetzt.
- [x] `404.html` hat Canonical, Favicon, Manifest, Theme-Color, Social-Meta und Rücklink zur Startseite.
- [x] `feedback-thanks.html` ist vorhanden.
- [x] `feedback-thanks.html` ist auf `noindex,follow` gesetzt.
- [x] `feedback-thanks.html` hat Canonical, Favicon, Manifest, Theme-Color, Social-Meta und Rücklink zum Feedback-Formular.

## Ergebnis Robots / Sitemap

- [x] Aktive `robots.txt` erlaubt Crawling und verweist auf `https://www.distillery.de/sitemap.xml`.
- [x] `robots.live.txt` ist als LIVE-Vorlage vorhanden und erlaubt Crawling.
- [x] `robots.staging.txt` ist als STAGING-Vorlage vorhanden und blockt Crawling.
- [x] Aktive `sitemap.xml` enthält die öffentlichen LIVE-Seiten.
- [x] Aktive `sitemap.xml` enthält `resident-releases.html`.
- [x] Aktive `sitemap.xml` enthält keine STAGING-URL.
- [x] `sitemap.live.xml` ist als LIVE-Vorlage vorhanden und enthält `lastmod`, `changefreq` und `priority`.
- [x] `feedback-thanks.html` ist nicht in der geprüften aktiven Sitemap und nicht in der LIVE-Sitemap-Vorlage enthalten.

## Ergebnis Security

- [x] `.well-known/security.txt` ist vorhanden.
- [x] Kontakt ist `club@distillery.de`.
- [x] Canonical verweist auf `https://www.distillery.de/.well-known/security.txt`.
- [x] Sprachen sind `de, en`.
- [x] Ablaufdatum ist gesetzt.

## Offene Punkte

- Kein Browser-Test durchgeführt.
- Kein LIVE-Test durchgeführt.
- STAGING-Schutz per `robots.txt` ersetzt keinen Zugriffsschutz. Basic Auth oder `X-Robots-Tag` bleiben serverabhängig offen.
- Ob Custom-404 auf dem späteren LIVE-Server wirklich greift, bleibt serverabhängig offen.
- `index.html` Test-Badge bleibt manueller Patch für morgen.

## Fazit

Repo-basiert sind die Utility-, Noindex-, Robots-, Sitemap- und Security-Dateien konsistent vorbereitet. Vor LIVE bleiben Serverprüfung, Browserprüfung und STAGING-Zugriffsschutz offen.
