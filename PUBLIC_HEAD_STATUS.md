# Public HTML Head Status

Status: Arbeitsdokument für den Go-Live-Check.

## Bereits erledigt

- `favicon.svg` existiert im Repo.
- `about.html` verlinkt `favicon.svg`.
- `contact.html` verlinkt `favicon.svg`.
- `news.html` verlinkt `favicon.svg`.
- `history.html` verlinkt `favicon.svg`.
- `impressum.html` verlinkt `favicon.svg`.
- `datenschutz.html` verlinkt `favicon.svg`.
- `feedback.html` verlinkt `favicon.svg`.
- `feedback-thanks.html` verlinkt `favicon.svg`.
- `404.html` verlinkt `favicon.svg`.
- `index.html`, `residents.html`, `resident-releases.html` enthalten Social-Preview-Metadaten.
- `resident-releases.html` ist in `sitemap.live.xml` enthalten.

## Noch offen

- `index.html` Favicon-Link ergänzen.
- `residents.html` Favicon-Link ergänzen.
- `resident-releases.html` Favicon-Link ergänzen.
- `feedback-thanks.html` optional auf `noindex,follow` setzen.
- `feedback-thanks.html` nicht in `sitemap.live.xml` führen.
- Social Preview als PNG/JPG ergänzen, falls maximale Plattform-Kompatibilität gewünscht ist.
- Nach STAGING/LIVE-Deployment mit Browser/Network prüfen, ob kein Favicon-404 mehr auftritt.

## Nicht anfassen ohne gesonderte Prüfung

- `public/events/data/events.json`
- `public/residents/data/residents.json`
- Admin-/Save-Workflows
