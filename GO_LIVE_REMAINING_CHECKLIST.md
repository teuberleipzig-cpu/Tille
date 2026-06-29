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
- [ ] `index.html` noch nicht sicher bearbeitet, weil langer Inline-Code vom Connector nicht vollständig sicher gelesen wurde.
- [ ] `residents.html` noch nicht sicher bearbeitet, weil langer Inline-Code vom Connector nicht vollständig sicher gelesen wurde.

### SEO / Indexierung – Vorlagen

- [x] `robots.live.txt` als inaktive LIVE-Vorlage angelegt.
- [x] `robots.staging.txt` als inaktive STAGING-Vorlage angelegt.
- [x] `sitemap.live.xml` als inaktive LIVE-Vorlage angelegt.
- [x] `DEPLOYMENT_STAGING_LIVE_NOTES.md` angelegt.
- [ ] Keine aktive Root-`robots.txt` angelegt.
- [ ] Keine aktive Root-`sitemap.xml` angelegt.

---

## P0 – Go-Live-Blocker

### P0-A Öffentliche Mainpage / `index.html`

- [ ] Sicheren vollständigen Bearbeitungsweg für `index.html` festlegen.
- [ ] `index.html` vollständig lesen, ohne gekürzte Inline-Zeilen zu riskieren.
- [ ] `lang` prüfen.
- [ ] Startseiten-`title` finalisieren.
- [ ] Startseiten-Meta-Description finalisieren.
- [ ] Canonical für LIVE vorbereiten.
- [ ] Open Graph Basics ergänzen.
- [ ] Twitter Card ergänzen.
- [ ] Impressum-Link im Footer ergänzen oder prüfen.
- [ ] Datenschutz-Link im Footer ergänzen.
- [ ] Club-Adresse im Footer prüfen.
- [ ] Email und Telefon im Footer prüfen.
- [ ] Interne Links prüfen.
- [ ] Keine aktive Event-/Dates-Logik beschädigen.
- [ ] Nach Änderung Browser-Smoke-Test durchführen.

### P0-B Öffentliche Residents-Seite / `residents.html`

- [ ] Sicheren vollständigen Bearbeitungsweg für `residents.html` festlegen.
- [ ] `residents.html` vollständig lesen, ohne gekürzte Inline-Zeilen zu riskieren.
- [ ] `lang` prüfen.
- [ ] Title prüfen.
- [ ] Meta Description ergänzen.
- [ ] Canonical ergänzen.
- [ ] Open Graph Basics ergänzen.
- [ ] Twitter Card ergänzen.
- [ ] Impressum-/Datenschutz-Link ergänzen.
- [ ] Resident-Datenladung prüfen.
- [ ] Resident-Medienpfade prüfen.
- [ ] Keine Residents-Daten direkt ändern.
- [ ] Browser-Smoke-Test durchführen.

### P0-C Legal / Pflichtangaben

- [ ] Impressum final fachlich/rechtlich prüfen.
- [ ] Anbieterangaben final bestätigen.
- [ ] Club-Adresse final bestätigen.
- [ ] Telefon und Email final bestätigen.
- [ ] Datenschutzseite final fachlich/rechtlich prüfen.
- [ ] Serverlogs des späteren Servers prüfen.
- [ ] Feedback-Formular-Dienst prüfen oder ersetzen.
- [ ] Externe Dienste prüfen.
- [ ] Tracking-Hinweis final entscheiden.
- [ ] Bild-/Urheberrechte für verwendete Medien prüfen.

### P0-D STAGING

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

### P0-E LIVE

- [ ] LIVE-Zielpfad bekannt.
- [ ] `distillery.de` / `www.distillery.de` final entschieden.
- [ ] HTTPS für LIVE aktiv.
- [ ] Redirect-Strategie final entschieden.
- [ ] `robots.live.txt` als LIVE-`/robots.txt` deployen.
- [ ] `sitemap.live.xml` als LIVE-`/sitemap.xml` deployen.
- [ ] LIVE Mainpage Smoke-Test.
- [ ] LIVE Admin V2 Smoke-Test.
- [ ] LIVE Resi-Admin Smoke-Test.
- [ ] LIVE Rollback dokumentieren.

### P0-F Admin V2 / Resi-Admin vor Launch

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
- [ ] Social Preview Bild / `og:image` entscheiden.
- [ ] `og:image` technisch einbinden.
- [ ] Sitemap finalisieren.
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

- [ ] Startseite visuell prüfen.
- [ ] Dates-/Eventdarstellung prüfen.
- [ ] News-Seite prüfen.
- [ ] Residents-Seite prüfen.
- [ ] About-Seite prüfen.
- [ ] Contact-Seite prüfen.
- [ ] History-Seite prüfen.
- [ ] Feedback-Seite prüfen.
- [ ] Impressum/Datenschutz optisch prüfen.
- [ ] Admin V2 optisch prüfen.
- [ ] Resi-Admin optisch prüfen.
- [ ] Mobile Navigation prüfen.
- [ ] Typografie prüfen.
- [ ] Abstände prüfen.
- [ ] Hoverstates prüfen.
- [ ] CTA-Texte prüfen.
- [ ] Gesamteindruck: wirkt wie Distillery, nicht generisch.

---

## P2 – Sehr wichtig, aber notfalls nach Launch

### P2-A Performance

- [ ] Lighthouse-Test auf STAGING.
- [ ] Lighthouse-Test auf LIVE.
- [ ] Bildgrößen prüfen.
- [ ] WebP/AVIF-Strategie prüfen.
- [ ] Lazy Loading prüfen.
- [ ] Font Loading prüfen.
- [ ] CSS-/JS-Größe prüfen.
- [ ] Cache-Header prüfen.

### P2-B Accessibility

- [ ] Tastaturbedienung prüfen.
- [ ] Fokuszustände prüfen.
- [ ] Kontraste prüfen.
- [ ] Formularlabels prüfen.
- [ ] Alt-Texte prüfen.
- [ ] Reduced-Motion prüfen.
- [ ] Screenreader-Basischeck durchführen.

### P2-C Betrieb / Monitoring

- [ ] Backup-Strategie definieren.
- [ ] Deployment-Log führen.
- [ ] Uptime-Monitoring prüfen.
- [ ] Error-Logging prüfen.
- [ ] Notfallkontakt definieren.
- [ ] Rollback-Ablauf testen.

---

## P3 – Später / Nice-to-have

- [ ] Automatischer Linkchecker.
- [ ] Automatisierte Lighthouse-Reports.
- [ ] Tracking-Charts im Admin.
- [ ] SEO-Content-Erweiterungen.
- [ ] automatische Sitemap-Generierung.
- [ ] bessere 404-Seite.
- [ ] Pressekits mit Ablaufdatum.
- [ ] Artist-spezifische Analytics.

---

## Aktueller nächster sinnvoller Schritt

1. Sicheren vollständigen Bearbeitungsweg für `index.html` klären.
2. Danach Startseite SEO/Footer/Open Graph ergänzen.
3. Danach `residents.html` analog sicher bearbeiten.
4. Erst danach aktive Root-`robots.txt` und Root-`sitemap.xml` für die jeweilige Umgebung vorbereiten.
