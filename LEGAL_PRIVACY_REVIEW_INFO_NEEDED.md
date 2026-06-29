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
- Feedback-Formular ist allgemein als externer Formular-Dienst beschrieben.
- Tracking ist als geplant, aber noch nicht aktiviert/final definiert beschrieben.
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

- Formularziel: `https://formsubmit.co/teuber1995@gmail.com`
- Methode: `POST`
- Externer Dienst: FormSubmit
- Weiterleitung nach Absenden: `https://teuberleipzig-cpu.github.io/Tille/feedback-thanks.html`
- Optionale Reply-Mail-Adresse wird abgefragt.
- Datenschutz-Hinweis im Formular weist bereits auf externen Formular-Dienst und Go-Live-Prüfstatus hin.

Vor LIVE zu entscheiden:

- [ ] Soll FormSubmit weiter genutzt werden?
- [ ] Soll die Zieladresse von `teuber1995@gmail.com` auf eine offizielle Distillery-Adresse geändert werden?
- [ ] Soll `_next` von GitHub Pages auf die LIVE-Domain geändert werden?
- [ ] Soll das Formular stattdessen selbst gehostet werden?
- [ ] Gibt es Spam-Schutz/Captcha und muss dieser in der Datenschutzseite beschrieben werden?
- [ ] Wer bekommt Feedback-Mails intern?
- [ ] Wie lange werden Feedback-Mails aufbewahrt?
- [ ] Wie wird mit Awareness-/Sicherheitsmeldungen intern umgegangen?

## Entscheidungsempfehlung ohne Rechtsbewertung

Für einen sauberen Go-Live sollten mindestens diese Punkte final geklärt werden:

1. Anbieteradresse im Impressum final bestätigen.
2. Server-/Hostingdaten klären.
3. Feedback-Formular-Ziel und Dienst final entscheiden.
4. `_next`-URL vor LIVE auf `https://www.distillery.de/feedback-thanks.html` setzen, falls das Formular live bleibt.
5. Tracking bis zur finalen Datenschutzentscheidung deaktiviert lassen oder sehr klar dokumentieren.
6. Datenschutzseite nach Server/Formular/Tracking-Entscheidung finalisieren lassen.
