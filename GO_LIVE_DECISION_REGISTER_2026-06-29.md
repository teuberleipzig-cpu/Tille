# Go-Live Decision Register – 2026-06-29

Status: Entscheidungsregister. Diese Datei dokumentiert offene Entscheidungen, trifft sie aber nicht selbst.

## P0-Entscheidungen vor LIVE

### Server / Hosting

Status: offen.

Zu entscheiden:

- Wer hostet STAGING und LIVE?
- Welche Zielpfade werden genutzt?
- Wie wird deployed?
- Wie wird zurückgerollt?

### Domains / Redirects

Status: offen.

Zu entscheiden:

- Wird `www.distillery.de` die kanonische LIVE-Domain?
- Was passiert mit `distillery.de` ohne www?
- Welche Weiterleitungen werden eingerichtet?

### HTTPS

Status: offen.

Zu entscheiden:

- Ist HTTPS für STAGING aktiv?
- Ist HTTPS für LIVE aktiv?
- Wer prüft Zertifikate nach Deployment?

### STAGING-Schutz

Status: offen.

Zu entscheiden:

- Reicht `robots.staging.txt` als Zusatzsignal?
- Wird Basic Auth oder ein Noindex-Header eingerichtet?

### Impressum / Datenschutz

Status: offen.

Zu entscheiden:

- Sind Anbieterangaben final korrekt?
- Ist die Anbieteradresse final korrekt?
- Sind Serverlogs, Hoster, Formular, externe Dienste und Tracking korrekt beschrieben?

### Feedback-Formular

Status: offen.

Zu entscheiden:

- Externen Formular-Dienst behalten, ersetzen oder selbst hosten?
- Welche Zieladresse wird genutzt?
- Welche Weiterleitung nach Absenden wird genutzt?
- Wie werden Spam-Schutz und Aufbewahrung geregelt?

### Bild- und Medienrechte

Status: offen.

Zu entscheiden:

- Sind Resident-Fotos freigegeben?
- Sind Release-Cover freigegeben?
- Sind Logo und Social-Preview-Grafik freigegeben?

### Tracking

Status: offen.

Zu entscheiden:

- Tracking zum Go-Live aktivieren oder deaktiviert lassen?
- Falls aktiv: welche Events, welcher Speicherort, welche Daten?
- Ist ein Cookie-/Consent-Hinweis nötig?

### Admin V2 / Resi-Admin

Status: offen.

Zu entscheiden:

- Wann werden Admin V2 und Resi-Admin auf STAGING getestet?
- Wann und wie werden sie auf LIVE getestet?
- Welche Speicheraktionen sind auf LIVE erlaubt?

## P1-Entscheidungen nach oder kurz vor LIVE

### Social Preview

Status: offen.

Zu entscheiden:

- Reicht SVG-Social-Preview?
- Wird ein PNG/JPG-Fallback ergänzt?

### Semantik / Accessibility

Status: offen.

Zu entscheiden:

- Wann werden H1/H2-Struktur, Tastaturtest, Screenreader-Test und Kontrasttest nachgezogen?

### CSV-Import Events

Status: offen.

Zu entscheiden:

- Wird CSV-Import vor LIVE benötigt oder später umgesetzt?
- Welche Spalten, Pflichtfelder und Validierungen gelten?

## Arbeitsregel

Keine Entscheidung in dieser Datei gilt als umgesetzt. Erst wenn die Entscheidung getroffen, umgesetzt und geprüft wurde, darf die jeweilige Checkliste aktualisiert werden.
