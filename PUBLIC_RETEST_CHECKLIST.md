# Public Retest Checklist

Status: Retest-Liste für die zuletzt ergänzten Public-Basics.
Datum: 2026-06-29.

## Testumgebung

- GitHub Pages: `https://teuberleipzig-cpu.github.io/Tille/`
- Browser: Chrome oder Edge
- DevTools: Network + Console öffnen
- Cache deaktivieren oder hart neu laden

## Favicon prüfen

Auf diesen Seiten hart neu laden und prüfen, ob kein relevanter `favicon`-404 mehr erscheint:

- `/about.html`
- `/contact.html`
- `/news.html`
- `/history.html`
- `/feedback.html`
- `/impressum.html`
- `/datenschutz.html`
- `/feedback-thanks.html`
- `/404.html`

Noch separat offen, weil lange Dateien nicht blind gepatcht werden:

- `/`
- `/residents.html`
- `/resident-releases.html?resident=submod`

## 404 prüfen

Eine bewusst falsche URL öffnen:

- `/does-not-exist-test.html`

Erwartung:

- eigene Distillery-404-Seite erscheint
- Footer mit Adresse sichtbar
- Impressum und Datenschutz klickbar
- keine relevanten Console-Fehler

## Feedback-Thanks prüfen

- `/feedback-thanks.html`

Erwartung:

- Seite lädt
- Favicon-Link vorhanden
- `meta name="robots" content="noindex,follow"` vorhanden
- Social Preview Tags vorhanden
- Footer mit Impressum/Datenschutz sichtbar

## Social Preview Basics prüfen

Im Seitenquelltext oder DevTools Head prüfen:

- `og:image` zeigt auf `https://www.distillery.de/assets/social-preview.svg`
- `og:image:width` ist `1200`
- `og:image:height` ist `630`
- `twitter:card` ist `summary_large_image`

## Bekannte offene Punkte

- Favicon-Link auf `index.html`, `residents.html`, `resident-releases.html` ist noch offen.
- Social Preview als SVG ist ein Zwischenstand; PNG/JPG wäre später robuster für Plattformen.
- Test-Badge muss vor LIVE entfernt werden.
- STAGING/LIVE-Serverprüfung bleibt offen.
