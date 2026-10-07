# Public Internal Link Audit – 2026-06-29

Status: Repo-basierter Link-Audit. Kein Browser-Test, kein LIVE-Test.

## Geprüfte Seiten

- `index.html`
- `news.html`
- `residents.html`
- `about.html`
- `contact.html`
- `history.html`
- `feedback.html`
- `impressum.html`
- `datenschutz.html`

## Geprüfte Navigation

Auf den geprüften Public-Seiten wurde die Hauptnavigation stichprobenartig bzw. direkt aus dem Repo geprüft.

Erwartete interne Links:

- `index.html`
- `news.html`
- `residents.html`
- `about.html`
- `contact.html`
- `history.html`
- `feedback.html`

Befund:

- [x] `index.html` enthält die erwartete Hauptnavigation.
- [x] `news.html` enthält die erwartete Hauptnavigation.
- [x] `residents.html` enthält die erwartete Hauptnavigation.
- [x] `about.html` enthält die erwartete Hauptnavigation.
- [x] `contact.html` enthält die erwartete Hauptnavigation.
- [x] `history.html` enthält die erwartete Hauptnavigation.
- [x] `feedback.html` enthält die erwartete Hauptnavigation.
- [x] `impressum.html` enthält die erwartete Hauptnavigation.
- [x] `datenschutz.html` enthält die erwartete Hauptnavigation.

## Geprüfte Footer-Links

Erwartete Footer-Links:

- `mailto:club@distillery.de`
- `tel:+4934135597400`
- `impressum.html`
- `datenschutz.html`

Befund:

- [x] `index.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `news.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `residents.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `about.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `contact.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `history.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `feedback.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.
- [x] `impressum.html` enthält Mail-, Telefon-, Impressum- und Datenschutz-Link.

Hinweis: `datenschutz.html` wurde im geprüften Bereich bis zum Datenschutz-Inhaltsblock gelesen; Navigation ist vorhanden. Footer-Ende sollte beim Browser-Smoke-Test zusätzlich visuell geprüft werden.

## Externe Links / Sonderfälle

- `contact.html` enthält einen externen Google-Maps-Link mit `target="_blank"` und `rel="noopener noreferrer"`.
- `feedback.html` enthält als Formularziel aktuell `https://formsubmit.co/distillery.feedback@gmail.com`.
- P1-Abgleich 2026-10-07: `_next` wird unmittelbar vor Submit auf `window.location.origin + '/feedback-thanks.html'` gesetzt; kein fester GitHub-Pages-/Staging-Host.

Diese Sonderfälle sind keine kaputten internen Links, bleiben aber vor LIVE fachlich/datenschutzseitig zu entscheiden.

## Offene Punkte

- Kein echter Browser-Klicktest in diesem Audit.
- Kein LIVE-Test.
- `index.html` enthält weiterhin den sichtbaren Test-Badge und bleibt in `MANUAL_TOMORROW_QUEUE.md` offen.
- Feedback-Zieladresse und same-origin-Weiterleitung sind technisch festgelegt; externe E2E-Submission und rechtliche Freigabe bleiben offen.
- Externe Dienste, insbesondere Google Maps und FormSubmit, bleiben Datenschutz-Prüfpunkte.

## Ergebnis

Repo-basiert sind die zentralen internen Public-Navigation- und Footer-Links konsistent. Für den Go-Live bleibt ein Browser-Klicktest nach dem manuellen `index.html`-Badge-Patch nötig.
