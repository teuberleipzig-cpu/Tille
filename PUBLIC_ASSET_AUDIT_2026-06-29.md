# Public Asset Audit – 2026-06-29

Status: Repo-basierter Asset-Audit. Kein Browser-Test, kein Social-Scraper-Test, kein LIVE-Test.

## Geprüfte Assets

- `assets/social-preview.svg`
- `favicon.svg`
- `site.webmanifest`

## Ergebnis

- [x] `assets/social-preview.svg` ist vorhanden.
- [x] `assets/social-preview.svg` ist als 1200 x 630 SVG angelegt.
- [x] `assets/social-preview.svg` enthält Titel und Beschreibung.
- [x] `assets/social-preview.svg` enthält Distillery-Leipzig-Text, Programmschlagworte und Adresse.
- [x] `favicon.svg` ist vorhanden.
- [x] `favicon.svg` ist als 64 x 64 SVG angelegt.
- [x] `favicon.svg` enthält einen zugänglichen Titel.
- [x] `site.webmanifest` ist vorhanden.
- [x] `site.webmanifest` enthält Name, Short Name, Description, Start URL, Scope, Display, Background Color und Theme Color.
- [x] `site.webmanifest` verweist auf `favicon.svg` als SVG-Icon.

## Offene Punkte

- Kein Browser-Test durchgeführt.
- Kein LIVE-Test durchgeführt.
- Kein Social-Scraper-Test durchgeführt.
- `og:image` und `twitter:image` nutzen aktuell SVG. Für maximale Kompatibilität mit Social-Plattformen bleibt ein PNG/JPG-Fallback offen.
- Keine `favicon.ico` oder PNG-App-Icons geprüft/angelegt. Das ist optional, solange `favicon.svg` und Manifest im Zielbrowser funktionieren.

## Fazit

Die zentralen Public-Assets für Social Preview, Favicon und Manifest sind repo-basiert vorhanden und konsistent. Vor LIVE bleiben Browser-Prüfung und Social-Preview-Kompatibilität offen.
