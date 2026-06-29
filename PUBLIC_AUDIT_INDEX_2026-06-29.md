# Public Audit Index – 2026-06-29

Status: Zentrale Übersicht über repo-basierte Audits und manuell verschobene Punkte. Diese Datei ändert keine Website-Funktion, keine Daten und kein Deployment.

## Zweck

Diese Datei bündelt die bisher angelegten Audit- und Go-Live-Dokumente, damit vor dem nächsten Arbeitsblock klar ist:

- was repo-basiert geprüft wurde
- was nur dokumentiert, aber nicht final erledigt ist
- welche Punkte weiterhin manuell oder fachlich entschieden werden müssen

## Zentrale Statusdateien

- `GO_LIVE_REMAINING_CHECKLIST.md` – Hauptcheckliste für offene und erledigte Go-Live-Punkte.
- `PUBLIC_PRELIVE_AUDIT_2026-06-29.md` – konsolidierter Pre-Live-Audit der Public-Seite.
- `MANUAL_TOMORROW_QUEUE.md` – bewusst auf morgen verschobene manuelle Arbeiten.
- `POST_DEPLOY_BROWSER_CHECK.md` – Browser-Checkliste nach finalem Deploy.

## Public-Audits

- `PUBLIC_INTERNAL_LINK_AUDIT_2026-06-29.md` – interne Public-Navigation und Footer-Links.
- `PUBLIC_HEAD_META_AUDIT_2026-06-29.md` – Head-/Meta-Basics, Canonicals, Favicon, Manifest, Social-Meta.
- `PUBLIC_ASSET_AUDIT_2026-06-29.md` – Social Preview, Favicon und Webmanifest.
- `PUBLIC_UTILITY_NO_INDEX_AUDIT_2026-06-29.md` – 404, Feedback-Thanks, Robots, Sitemaps und Security-Datei.
- `PUBLIC_EXTERNAL_SERVICES_PRIVACY_AUDIT_2026-06-29.md` – externe Dienste, Formular, Kartenlink und Datenschutzstatus.

## Deployment-/Infrastruktur-Audits

- `DEPLOYMENT_STAGING_LIVE_NOTES.md` – Deployment-Notizen für STAGING und LIVE.
- `STAGING_LIVE_SERVER_INFO_NEEDED.md` – fehlende Server- und Hostinginformationen.
- `DEPLOYMENT_READINESS_AUDIT_2026-06-29.md` – aktueller Deployment-Readiness-Stand.

## Medien-/Tracking-Audits

- `MEDIA_RIGHTS_READINESS_AUDIT_2026-06-29.md` – Medien- und Bildrechte-Readiness.
- `TRACKING_READINESS_AUDIT_2026-06-29.md` – Tracking-Readiness ohne Tracking-Implementierung.

## Manuelle / blockierte Dokumentationspunkte

Diese Punkte wurden bewusst nicht weiter automatisiert:

- `index.html` Test-Badge entfernen: steht in `MANUAL_TOMORROW_QUEUE.md`.
- Tagesupdate in Google Drive optional nachtragen: steht in `MANUAL_TOMORROW_QUEUE.md`.
- Semantik-/Accessibility-Audit: Write wurde zweimal blockiert, Kurzinhalt liegt im Chatverlauf.
- CSV-Import-Readiness-Audit: Write wurde zweimal blockiert, Kurzinhalt liegt im Chatverlauf.

## Aktuelle Top-Blocker vor LIVE

1. `index.html` Test-Badge entfernen und danach Browser-Check durchführen.
2. STAGING/LIVE-Serverdaten, Zielpfade, HTTPS, Redirects und Rollback klären.
3. Impressum und Datenschutz final fachlich/rechtlich prüfen.
4. Feedback-Formular-Dienst, Zieladresse und Weiterleitung final entscheiden.
5. Bild-/Medienrechte final bestätigen.
6. Tracking final entscheiden oder vorerst deaktiviert lassen.
7. Admin V2 und Resi-Admin auf STAGING/LIVE testen.

## Arbeitsregel

Erledigt wird nur markiert, was wirklich umgesetzt und geprüft wurde. Dokumentierte Risiken oder Readiness-Audits ersetzen keine fachliche Freigabe, keinen Browser-Test und kein echtes STAGING-/LIVE-Deployment.
