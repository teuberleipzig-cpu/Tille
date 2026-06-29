# Media / Rights Readiness Audit – 2026-06-29

Status: Repo-basierter Audit. Keine Datenänderung, keine Rechtsberatung, keine abschließende Bildrechteprüfung.

## Geprüfte Bereiche

- Resident-Datenquelle
- Resident-/Release-Medienpfade
- Release-Cover-Dateien
- öffentliche Branding-Assets
- Social-Preview-Asset

## Befund

- [x] `public/residents/data/residents.json` wurde nur lesend geprüft und nicht verändert.
- [x] Im geprüften Bereich enthält die Resident-Datenquelle keinen sichtbaren JSON-Inhalt.
- [x] Release-Cover-Datei `test-cover-1782222845287.jpg` ist im Repo vorhanden und als JPEG abrufbar.
- [x] Release-Cover-Datei `pellegrin-ep-cover-1782222969213.jpg` ist im Repo vorhanden und als JPEG abrufbar.
- [x] `assets/social-preview.svg` ist vorhanden und besteht aus grafischen SVG-Elementen/Text.
- [x] `assets/distillery-logo.png` ist vorhanden und als PNG abrufbar.
- [x] Public-Seiten nutzen Logo-Alt-Texte.
- [x] Residents-/Release-Templates erzeugen dynamische Alt-Texte aus Resident- oder Release-Namen.

## Offene Punkte vor LIVE

- [ ] Bildrechte für alle Resident-Fotos final bestätigen.
- [ ] Bildrechte für alle Release-Cover final bestätigen.
- [ ] Rechte / Nutzungserlaubnis für `assets/distillery-logo.png` final bestätigen.
- [ ] Rechte / Nutzungserlaubnis für Social-Preview-Grafik final bestätigen.
- [ ] Prüfen, ob externe Artist-/Label-/Social-Medien eingebettet oder nur verlinkt werden.
- [ ] Prüfen, ob fehlende Medien auf LIVE zu sichtbaren Platzhaltern oder 404s führen.
- [ ] Browser-/Network-Test für alle öffentlichen Medien nach finalem Deploy durchführen.
- [ ] Social-Preview-PNG/JPG-Fallback weiterhin prüfen.

## Nicht geprüft

- Keine vollständige Rechtekette.
- Keine Einwilligungen von Fotografen, Artists oder Labels.
- Keine EXIF-/Metadatenprüfung.
- Keine vollständige Bildinventur aller möglichen späteren Uploads.
- Kein Browser-/LIVE-Test.

## Einschätzung

Repo-basiert sind zentrale Medien vorhanden und technisch abrufbar. Für den echten Go-Live bleibt die Bildrechteprüfung ein fachlicher Blocker, insbesondere für Resident-Fotos, Release-Cover und Branding-Material.
