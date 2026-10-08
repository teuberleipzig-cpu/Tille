# Legal / Privacy Review Info Needed

Diese Datei sammelt offene Informationen für Impressum, Datenschutz und Feedback-Formular vor dem echten Go-Live. Sie enthält keine Rechtsberatung und ersetzt keine finale fachliche/rechtliche Prüfung.

## Impressum

Aktueller Stand in `impressum.html`:

- Anbieter: `Distillery`
- Name: `Steffen Kache`
- Anbieteradresse: `Parkstraße 12, 04288 Leipzig, Germany`
- Steuerangaben vorhanden
- Club-Kontakt: `Distillery Leipzig, Eggebrechtstraße 2, 04103 Leipzig`
- Telefon: `+49 341 35597400`
- Email: `club@distillery.de`

Vor LIVE zu bestätigen:

- [ ] Ist `Distillery` die korrekte Anbieterbezeichnung?
- [ ] Ist `Steffen Kache` die korrekte verantwortliche Person / der korrekte Anbieter?
- [ ] Ist `Parkstraße 12, 04288 Leipzig` die korrekte Anbieteradresse?
- [ ] Soll zusätzlich oder stattdessen die Clubadresse `Eggebrechtstraße 2, 04103 Leipzig` als Anbieteradresse verwendet werden?
- [ ] Sind Steuernummer und USt-IdNr. korrekt und sollen öffentlich sichtbar bleiben?
- [ ] Fehlen Registerangaben, Aufsichtsbehörde, redaktionell Verantwortliche Person oder sonstige Pflichtangaben?
- [ ] Soll der Hinweis `(Keine Booking-Anfragen / No Booking-Requests!)` im Impressum bleiben?

## Datenschutz

Aktueller Stand in `datenschutz.html`:

- Seite ist ausdrücklich als Arbeitsstand markiert.
- Verantwortliche Stelle ist `Distillery Leipzig, Eggebrechtstraße 2, 04103 Leipzig, club@distillery.de`.
- Serverlogs sind allgemein beschrieben, aber serverabhängig noch nicht final.
- Bekannter Feedback-Datenfluss: Website → FormSubmit → distillery.feedback@gmail.com → Google Apps Script → Trello.
- Tracking-Code ist eingebunden, aber technisch deaktiviert (TRACKING_ENABLED = false); darüber werden keine Trackingevents versendet.
- Externe Dienste sind allgemein genannt, aber noch nicht einzeln final geprüft.

Vor LIVE zu bestätigen:

- [ ] Welche Serverlogs entstehen auf dem echten LIVE-Server?
- [ ] Welche Daten stehen in den Logs: IP, User-Agent, Timestamp, URL, Referrer, Statuscode?
- [ ] Wie lange werden Serverlogs gespeichert?
- [ ] Wer hostet die LIVE-Seite?
- [ ] Gibt es Auftragsverarbeitung / AV-Vertrag mit dem Hoster?
- [ ] Wird Tracking wirklich aktiviert oder bleibt es vorerst aus?
- [ ] Falls Tracking: Welche Events werden gespeichert?
- [ ] Falls Tracking: Wo werden die Daten gespeichert?
- [ ] Falls Tracking: Werden IPs, Cookies, Fingerprints oder personenbezogene IDs gespeichert?
- [ ] Werden externe Medien-Embeds geladen?
- [ ] Werden Social-Links nur verlinkt oder Inhalte eingebettet?
- [ ] Werden externe Fonts, Karten, Captchas oder Spam-Schutz-Dienste genutzt?
- [ ] Ist ein Cookie-/Consent-Hinweis notwendig?
- [ ] Welche Aufbewahrungsfristen gelten für Kontakt- und Feedback-Anfragen?

## Feedback-Formular

Aktueller Stand in `feedback.html`:

- Formularziel: `https://formsubmit.co/distillery.feedback@gmail.com`
- Methode: `POST`
- Externer Dienst: FormSubmit
- Weiterleitung nach Absenden: unmittelbar vor Submit kontrolliert `window.location.origin + '/feedback-thanks.html'`; kein GitHub-Pages-Ziel.
- Optionale Reply-Mail-Adresse wird abgefragt.
- Datenschutz-Hinweis im Formular weist bereits auf externen Formular-Dienst und Go-Live-Prüfstatus hin.

Vor LIVE zu entscheiden:

Technisch geklärt (P1, 2026-10-07; keine rechtliche Freigabe):

- FormSubmit bleibt aktuell der Formularservice.
- Operatives Ziel ist distillery.feedback@gmail.com.
- Danach verarbeitet Google Apps Script die Mails und überträgt benötigte Inhalte in Trello; accountseitige Übertragung laut Nutzer erfolgt.
- `_next` verwendet dieselbe Origin, nicht GitHub Pages oder einen festen Staging-Host.

Weiterhin offen:

- [ ] Finale rechtliche Prüfung von FormSubmit.
- [ ] Gmail-/Google-Verarbeitung prüfen.
- [ ] Apps-Script-Verarbeitung prüfen.
- [ ] Trello-Verarbeitung prüfen.
- [ ] Löschprozess für Mails und nachgelagerte Inhalte klären.
- [ ] Gibt es Spam-Schutz/Captcha und muss dieser in der Datenschutzseite beschrieben werden?
- [ ] Wer bekommt Feedback-Mails intern?
- [ ] Wie lange werden Feedback-Mails aufbewahrt?
- [ ] Wie wird mit Awareness-/Sicherheitsmeldungen intern umgegangen?

## Entscheidungsempfehlung ohne Rechtsbewertung

Für einen sauberen Go-Live sollten mindestens diese Punkte final geklärt werden:

1. Anbieteradresse im Impressum final bestätigen.
2. Server-/Hostingdaten klären.
3. Den technisch festgelegten Feedback-Datenfluss rechtlich/organisatorisch prüfen.
4. Same-origin-Weiterleitung im späteren freigegebenen E2E prüfen; in P1 keine externe Submission.
5. Tracking deaktiviert lassen; vor jeder Aktivierung erneut technisch/datenschutzrechtlich prüfen.
6. Datenschutzseite nach Server/Formular/Tracking-Entscheidung finalisieren lassen.
