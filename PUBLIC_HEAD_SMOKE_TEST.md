# Public Head / Favicon Smoke Test

Status: Testanleitung für GitHub Pages, STAGING und später LIVE.

## Ziel

Prüfen, ob öffentliche Seiten die erwarteten Head-Basics enthalten und keine sichtbaren Browser-/Network-Fehler durch Favicon oder Social-Preview-Basics entstehen.

## Seiten

- `/`
- `/residents.html`
- `/resident-releases.html?resident=submod`
- `/news.html`
- `/about.html`
- `/contact.html`
- `/history.html`
- `/feedback.html`
- `/feedback-thanks.html`
- `/impressum.html`
- `/datenschutz.html`
- `/404.html`

## Manuelle Prüfung im Browser

1. DevTools öffnen.
2. Network öffnen.
3. Disable cache aktivieren.
4. Seite hart neu laden.
5. Prüfen, ob keine relevanten 404-Fehler auftreten.
6. Favicon-Anfragen prüfen.
7. Console auf neue relevante Fehler prüfen.
8. Footer prüfen: Adresse, Email, Telefon, Impressum, Datenschutz.
9. Bei Residents/Releases prüfen, ob Medienpfade nicht auf `/residents/media/...` ohne `public/` oder ohne `/Tille/` zeigen.

## Head-Prüfung pro Seite

Erwartet sind je nach Seitentyp:

- `title`
- `meta name="description"`
- `link rel="canonical"`
- `link rel="icon" href="favicon.svg" type="image/svg+xml"`
- Open Graph Basics
- `twitter:card`
- `twitter:image` auf Hauptseiten und öffentlichen Inhaltsseiten
- `robots noindex` nur dort, wo sinnvoll, z. B. 404 oder Danke-Seite

## Bekannte offene Punkte

- `index.html`, `residents.html`, `resident-releases.html` brauchen noch Favicon-Link.
- `feedback-thanks.html` sollte optional noch `noindex,follow` bekommen.
- Social Preview ist aktuell SVG; für maximale externe Plattform-Kompatibilität später PNG/JPG prüfen.
- Aktive Root-`robots.txt` und Root-`sitemap.xml` erst nach STAGING/LIVE-Entscheidung deployen.
