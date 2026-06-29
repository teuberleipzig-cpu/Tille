# Public External Services / Privacy Audit – 2026-06-29

Status: Repo-basierter Audit. Kein Browser-Test, kein LIVE-Test, keine Rechtsberatung.

## Geprüfte Dateien

- `feedback.html`
- `contact.html`
- `datenschutz.html`
- `LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md`

## Ergebnis externe Dienste

### Feedback-Formular

- [x] `feedback.html` nutzt aktuell einen externen Formular-Dienst.
- [x] Formularmethode ist `POST`.
- [x] Formular enthält ein Honeypot-Feld.
- [x] Formular fragt optional eine Reply-Mail-Adresse ab.
- [x] Formular-Datenschutzhinweis nennt externen Formular-Dienst und Go-Live-Prüfstatus.
- [ ] Nutzung des externen Formular-Dienstes vor LIVE final entscheiden.
- [ ] Zieladresse vor LIVE final entscheiden.
- [ ] Weiterleitung nach Absenden vor LIVE auf LIVE-Domain ändern, falls das Formular live bleibt.
- [ ] Spam-Schutz/Captcha-Verhalten final prüfen.
- [ ] Aufbewahrung und interner Umgang mit Feedback-Mails final klären.

### Google Maps

- [x] `contact.html` enthält einen externen Google-Maps-Link.
- [x] Google Maps ist als Link umgesetzt, nicht als eingebettete Karte.
- [x] Link öffnet in neuem Tab.
- [x] Sicherheitsattribute für neuen Tab sind gesetzt.
- [ ] Datenschutztext für Kartenlinks vor LIVE final prüfen.

### Social Preview / eigene Domain

- [x] Public-Seiten verwenden ein Social-Preview-Bild auf der geplanten LIVE-Domain.
- [ ] SVG-Social-Preview-Kompatibilität prüfen; PNG/JPG-Fallback bleibt offen.

### Mail / Telefon

- [x] Mail-Links sind vorhanden.
- [x] Telefon-Links sind vorhanden.
- [ ] Zuständigkeit und Aufbewahrung von eingehenden Kontakt- und Feedback-Mails final klären.

## Ergebnis Datenschutzseite

- [x] `datenschutz.html` ist ausdrücklich als Arbeitsstand markiert.
- [x] Serverlogs werden als serverabhängig offen markiert.
- [x] Feedback-Formular wird als externer Formular-Dienst beschrieben.
- [x] Tracking wird als geplant, aber vor Aktivierung entscheidungspflichtig beschrieben.
- [x] Externe Dienste werden als Go-Live-Prüfpunkt beschrieben.
- [ ] Datenschutzseite final fachlich/rechtlich prüfen.

## Offene P0/P1-Entscheidungen

- Externen Formular-Dienst behalten, ersetzen oder selbst hosten.
- Formular-Zieladresse final entscheiden.
- Formular-Weiterleitung auf LIVE-Domain ändern, falls Formular live bleibt.
- Serverlogs und Hoster-Daten klären.
- Tracking vorerst deaktiviert lassen oder final dokumentieren.
- Kartenlinks, Social-Links, externe Medien, Fonts und sonstige Drittanbieter final prüfen.

## Fazit

Repo-basiert sind die externen Dienste identifiziert und dokumentiert. Der größte offene Public-Privacy-Punkt ist das Feedback-Formular mit externem Dienst, aktueller Zieladresse und noch nicht finaler LIVE-Weiterleitung. Vor LIVE sind Entscheidung und finale Datenschutzprüfung nötig.
