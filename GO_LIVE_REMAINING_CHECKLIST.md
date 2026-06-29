# Distillery Website – Remaining Go-Live Checklist

Status: Arbeitsdokument. Diese Datei dokumentiert offene Punkte, aktiviert keine Website-Funktion, enthält keine Zugangsdaten und verändert keine produktiven Daten.

## Legende

- P0 = Go-Live-Blocker
- P1 = muss vor öffentlichem Launch erledigt sein
- P2 = sehr wichtig, kann notfalls kurz nach Launch folgen
- P3 = nice-to-have / spätere Optimierung

Ein Punkt gilt nur als erledigt, wenn er umgesetzt und geprüft wurde. Teilweise erledigte Punkte bleiben offen.

---

## Aktuell bereits erledigt / teilweise erledigt

### Admin V2 Recovery

- [x] Admin V2 bis `admin-v2-structure-25 geladen` stabilisiert.
- [x] HealthCheck, SmokeTest und Walkthrough zuletzt grün getestet.
- [x] Events-Save per Browser-Save und PostReloadCheck bestätigt.
- [x] Residents-Save per Browser-Save und PostReloadCheck bestätigt.
- [x] Releases-Workflow-Crash behoben.
- [x] Draft-Quota-Guard ergänzt.

### Öffentliche statische Seiten – Basics

- [x] `datenschutz.html` als Go-Live-Arbeitsstand angelegt.
- [x] `impressum.html` um Club-Kontakt und Go-Live-Prüfhinweis ergänzt.
- [x] Legal-Footer auf mehreren statischen Unterseiten ergänzt.
- [x] Meta Descriptions und Canonicals auf mehreren statischen Unterseiten ergänzt.
- [x] Open-Graph-/Twitter-Basics auf mehreren statischen Unterseiten ergänzt.
- [x] `index.html` sicher gelesen und SEO-/Footer-Basics ergänzt.
- [x] `residents.html` sicher gelesen und SEO-/Footer-Basics ergänzt.
- [x] `resident-releases.html` mit SEO-/Footer-/Media-Basics ergänzt.
- [x] Öffentliche Media-Pfade auf Startseite, Residents-Seite und Resident-Releases-Seite für GitHub Pages normalisiert.
- [x] Public-Site-Smoke-Test auf GitHub Pages bestanden und in `PUBLIC_SITE_SMOKE_TEST.md` dokumentiert.
- [x] Root-`favicon.svg` und `site.webmanifest` angelegt.
- [x] Favicon/Manifest/Theme-Color auf öffentlichen Public-Seiten vereinheitlicht.
- [x] `feedback.html` hat Favicon/Manifest/Theme-Color und wurde nach Deployment direkt geprüft.
- [x] `404.html` als noindex-Fehlerseite mit Social-/Favicon-Meta vorbereitet.
- [x] `.well-known/security.txt` mit Kontaktadresse angelegt.
- [x] `PUBLIC_INTERNAL_LINK_AUDIT_2026-06-29.md` als repo-basierter interner Link-Audit angelegt.
- [x] `PUBLIC_ASSET_AUDIT_2026-06-29.md` als repo-basierter Asset-Audit angelegt.
- [x] `PUBLIC_UTILITY_NO_INDEX_AUDIT_2026-06-29.md` als repo-basierter Utility-/Noindex-Audit angelegt.
- [ ] Sichtbarer Test-Badge `TEST BUILD / public-media-fix-4` vollständig aus dem Repo entfernt. `residents.html` und `resident-releases.html` sind sauber; `index.html` bleibt als manueller Patch für morgen offen.

### SEO / Indexierung – Vorlagen und aktive Dateien

- [x] `robots.live.txt` als inaktive LIVE-Vorlage angelegt.
- [x] `robots.staging.txt` als inaktive STAGING-Vorlage angelegt.
- [x] `sitemap.live.xml` als inaktive LIVE-Vorlage angelegt und mit `lastmod` ergänzt.
- [x] `DEPLOYMENT_STAGING_LIVE_NOTES.md` angelegt und nach Root-SEO-Dateien aktualisiert.
- [x] `STAGING_LIVE_SERVER_INFO_NEEDED.md` mit fehlenden Server-/Hostingdaten angelegt.
- [x] Aktive Root-`robots.txt` angelegt.
- [x] Aktive Root-`sitemap.xml` angelegt und mit `lastmod` versehen.
- [x] `resident-releases.html` in aktive Root-`sitemap.xml` aufgenommen.

### Legal / Privacy Vorbereitung

- [x] `impressum.html` geprüft: technische Seite vorhanden, fachliche/rechtliche Bestätigung offen.
- [x] `datenschutz.html` geprüft: Arbeitsstand vorhanden, server-/formular-/trackingabhängige Angaben offen.
- [x] `feedback.html` geprüft: FormSubmit-Ziel und GitHub-Pages-Weiterleitung dokumentiert.
- [x] `LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md` mit offenen Legal-/Privacy-Entscheidungen angelegt.

### Manuelle Warteschlange

- [x] `MANUAL_TOMORROW_QUEUE.md` angelegt.
- [x] `INDEX_TEST_BADGE_MANUAL_PATCH.md` angelegt.
- [ ] Manueller Patch `index.html` Test-Badge entfernen.
- [ ] Browser-Check nach Badge-Entfernung durchführen.

---

## P0 – Go-Live-Blocker

### P0-A Öffentliche Mainpage / `index.html`

- [x] Sicheren vollständigen Bearbeitungsweg für `index.html` festlegen.
- [x] `index.html` vollständig lesen, ohne gekürzte Inline-Zeilen zu riskieren.
- [x] `lang` prüfen.
- [x] Startseiten-`title` finalisieren.
- [x] Startseiten-Meta-Description finalisieren.
- [x] Canonical für LIVE vorbereiten.
- [x] Open Graph Basics ergänzen.
- [x] Twitter Card ergänzen.
- [x] Impressum-Link im Footer ergänzen oder prüfen.
- [x] Datenschutz-Link im Footer ergänzen.
- [x] Club-Adresse im Footer prüfen.
- [x] Email und Telefon im Footer prüfen.
- [x] Interne Footer-Links im Browser geprüft.
- [x] Repo-basierter interner Link-Audit erstellt; Browser-Klicktest bleibt offen.
- [x] Keine relevante Event-/Dates-Logik-Beschädigung im Browser-Smoke-Test gemeldet.
- [x] Resident-Slideshow-Media-Pfade für GitHub Pages korrigiert.
- [x] Public-Site-Smoke-Test für Startseite bestanden.
- [x] Favicon/Manifest/Theme-Color auf `index.html` ergänzt.
- [ ] Sichtbaren Test-Badge vor LIVE aus `index.html` entfernen. Siehe `MANUAL_TOMORROW_QUEUE.md`.

### P0-B Öffentliche Residents-Seite / `residents.html`

- [x] Sicheren vollständigen Bearbeitungsweg für `residents.html` festlegen.
- [x] `residents.html` vollständig lesen, ohne gekürzte Inline-Zeilen zu riskieren.
- [x] `lang` prüfen.
- [x] Title prüfen.
- [x] Meta Description ergänzen.
- [x] Canonical ergänzen.
- [x] Open Graph Basics ergänzen.
- [x] Twitter Card ergänzen.
- [x] Impressum-/Datenschutz-Link ergänzen.
- [x] Resident-Datenladung im Browser-Smoke-Test ohne relevante Fehler bestätigt.
- [x] Resident- und Release-Medienpfade für GitHub Pages normalisiert.
- [x] Keine Residents-Daten direkt geändert.
- [x] Public-Site-Smoke-Test für Residents-Seite bestanden.
- [x] Favicon/Manifest/Theme-Color auf `residents.html` ergänzt.
- [x] Sichtbaren Test-Badge vor LIVE entfernt.

### P0-C Öffentliche Resident-Releases-Seite / `resident-releases.html`

- [x] `resident-releases.html` als öffentliche Resident-Unterseite vorhanden.
- [x] Title und Meta Description gesetzt.
- [x] Canonical gesetzt.
- [x] Open Graph Basics ergänzt.
- [x] Twitter Card ergänzt.
- [x] Impressum-/Datenschutz-Link vorhanden.
- [x] Media-Pfade für GitHub Pages normalisiert.
- [x] Favicon/Manifest/Theme-Color ergänzt.
- [x] In aktive Root-`sitemap.xml` aufgenommen.
- [x] Sichtbaren Test-Badge vor LIVE entfernt.

### P0-D Legal / Pflichtangaben

- [x] Offene Legal-/Privacy-Informationen in `LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md` dokumentiert.
- [ ] Impressum final fachlich/rechtlich prüfen.
- [ ] Anbieterangaben final bestätigen.
- [ ] Anbieteradresse final bestätigen.
- [x] Club-Adresse auf öffentlichen Seiten sichtbar.
- [x] Telefon und Email auf öffentlichen Seiten sichtbar.
- [x] Impressum-Link auf geprüften öffentlichen Seiten sichtbar und klickbar.
- [x] Datenschutz-Link auf geprüften öffentlichen Seiten sichtbar und klickbar.
- [ ] Datenschutzseite final fachlich/rechtlich prüfen.
- [ ] Serverlogs des späteren Servers prüfen.
- [ ] Feedback-Formular-Dienst prüfen oder ersetzen.
- [ ] Feedback-Formular-Zieladresse final entscheiden.
- [ ] Feedback-Weiterleitungs-URL auf LIVE-Domain umstellen, falls Formular live bleibt.
- [ ] Externe Dienste prüfen.
- [ ] Tracking-Hinweis final entscheiden.
- [ ] Bild-/Urheberrechte für verwendete Medien prüfen.

### P0-E STAGING

- [x] Fehlende Server-/Hostinginformationen in `STAGING_LIVE_SERVER_INFO_NEEDED.md` dokumentiert.
- [ ] Serverzugriff bekannt.
- [ ] STAGING-Zielpfad bekannt.
- [ ] `teuberstaging.distillery.de` technisch eingerichtet.
- [ ] HTTPS für STAGING aktiv.
- [ ] STAGING vor Indexierung schützen.
- [ ] `robots.staging.txt` als STAGING-`/robots.txt` deployen.
- [ ] Zusätzlich `X-Robots-Tag: noindex, nofollow` oder Basic Auth einrichten, falls möglich.
- [ ] STAGING Mainpage testen.
- [ ] STAGING Admin V2 testen.
- [ ] STAGING Resi-Admin testen.
- [ ] STAGING Rollback dokumentieren.

### P0-F LIVE

- [x] Fehlende LIVE-Server-/Hostinginformationen in `STAGING_LIVE_SERVER_INFO_NEEDED.md` dokumentiert.
- [ ] LIVE-Zielpfad bekannt.
- [ ] `distillery.de` / `www.distillery.de` final entschieden.
- [ ] HTTPS für LIVE aktiv.
- [ ] Redirect-Strategie final entschieden.
- [ ] Test-Badge vor LIVE vollständig aus dem Repo entfernt. `index.html` bleibt offen.
- [ ] `robots.txt` auf LIVE prüfen.
- [ ] `sitemap.xml` auf LIVE prüfen.
- [ ] LIVE Mainpage Smoke-Test.
- [ ] LIVE Admin V2 Smoke-Test.
- [ ] LIVE Resi-Admin Smoke-Test.
- [ ] LIVE Rollback dokumentieren.

### P0-G Admin V2 / Resi-Admin vor Launch

- [ ] Admin V2 auf STAGING testen.
- [ ] Admin V2 auf LIVE testen.
- [ ] Events laden auf STAGING.
- [ ] Events speichern auf STAGING.
- [ ] Events laden auf LIVE.
- [ ] Events speichern auf LIVE nur nach Freigabe testen.
- [ ] Residents laden auf STAGING.
- [ ] Residents speichern auf STAGING.
- [ ] Residents laden auf LIVE.
- [ ] Residents speichern auf LIVE nur nach Freigabe testen.
- [ ] Resi-Admin Login/Code testen.
- [ ] Resi-Admin darf nur eigenen Resident ändern.
- [ ] Presskit-Upload testen.
- [ ] Slide-/Foto-Upload testen.
- [ ] Release-Cover-Upload testen.
- [ ] Medienlöschung testen.
- [ ] Reload-Verifikation je Save-Pfad.

---

## P1 – Muss vor öffentlichem Launch erledigt sein

### P1-A Technische SEO

- [ ] Finaler SEO-Audit durchführen.
- [ ] Startseiten-H1/H2-Struktur prüfen.
- [ ] Unterseiten-H1/H2-Struktur prüfen.
- [ ] Alt-Texte prüfen.
- [ ] Social Preview Bild final entscheiden: SVG ist eingebunden, PNG/JPG-Fallback bleibt offen.
- [x] `og:image` technisch einbinden.
- [x] Sitemap als aktive Root-`sitemap.xml` vorbereiten.
- [ ] Canonicals final prüfen.
- [ ] STAGING-Noindex final prüfen.
- [ ] 404-/Redirect-Konzept prüfen.
- [ ] Alte URLs aus Wayback/alter Website prüfen.
- [ ] Local SEO Leipzig prüfen.
- [ ] Event-SEO-Konzept prüfen.
- [ ] Residents-SEO-Konzept prüfen.

### P1-B CSV-Import Events

- [ ] Bestehende Admin-V2-Eventstruktur analysieren.
- [ ] CSV-Spalten definieren.
- [ ] Beispiel-CSV definieren.
- [ ] Beispiel-CSV Download-Button bauen.
- [ ] CSV-Dateiauswahl bauen.
- [ ] CSV-Parsing bauen.
- [ ] Pflichtfelder validieren.
- [ ] Datumsformat validieren.
- [ ] Fehlerliste pro Zeile anzeigen.
- [ ] Import-Vorschau anzeigen.
- [ ] Duplikate erkennen.
- [ ] Kein Überschreiben ohne Bestätigung.
- [ ] Import abbrechen können.
- [ ] Import übernehmen können.
- [ ] Erst nach expliziter Bestätigung speichern.
- [ ] Reload-Verifikation durchführen.

### P1-C Datenschutzarmes Tracking

- [ ] Tracking-Konzept final definieren.
- [ ] Klären, ob serverseitiges CSV/JSON/Log-Tracking möglich ist.
- [ ] Pageview-Events definieren.
- [ ] Button-Klick-Events definieren.
- [ ] Formular-Events definieren.
- [ ] Presskit-Download-Events definieren.
- [ ] Email-Klick-Events definieren.
- [ ] Resident-Tab-Klicks definieren.
- [ ] Keine Cookies/Fingerprints ohne Notwendigkeit.
- [ ] Keine unnötigen IPs speichern.
- [ ] STAGING/LIVE Tracking trennen.
- [ ] Admin-V2-Tracking-Tab bauen.
- [ ] Resi-Admin-Tracking-Kachel bauen.
- [ ] Zeitraumfilter bauen.
- [ ] CSV-Export bauen.
- [ ] Datenschutzseite entsprechend finalisieren.

### P1-D UI-Finalcheck

- [x] Public-Site-Smoke-Test auf GitHub Pages für Hauptseiten bestanden.
- [x] Impressum, Datenschutz und Adresse auf geprüften öffentlichen Seiten sichtbar und klickbar.
- [ ] Startseite final visuell prüfen.
- [ ] Dates-/Eventdarstellung final prüfen.
- [ ] News-Seite final prüfen.
- [ ] Residents-Seite final prüfen.
- [ ] About-Seite final prüfen.
