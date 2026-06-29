# Tomorrow Go-Live Runbook – 2026-06-30

Status: Arbeitsreihenfolge für den nächsten manuellen Block. Keine Zugangsdaten, keine Secrets, kein Deployment-Automatismus.

## Ziel

Morgen die manuell verschobenen P0/P1-Punkte in einer sinnvollen Reihenfolge abarbeiten, ohne geprüfte Repo-Arbeit zu überschreiben.

## Reihenfolge

### 1. Manuelle Queue öffnen

- `MANUAL_TOMORROW_QUEUE.md` lesen.
- Nichts als erledigt markieren, bevor es wirklich umgesetzt und geprüft wurde.

### 2. `index.html` Test-Badge entfernen

- Nur den sichtbaren Test-Badge-Block aus `index.html` entfernen.
- Keine Event-Logik, keine Media-Logik, keine Styles und keine Daten-Dateien anfassen.
- Commit mit konkreter Message erstellen.

### 3. GitHub-Pages-Deploy abwarten

- Nach dem Commit warten, bis GitHub Pages aktualisiert ist.
- Nicht mit alten Browser-Caches verwechseln.

### 4. Browser-Check durchführen

Mindestens öffnen:

- GitHub-Pages-Startseite
- Residents-Seite
- Resident-Releases-Seite
- Favicon
- Manifest
- Sitemap
- Security-Datei

Prüfen:

- kein sichtbarer Test-Badge
- Seiten laden normal
- Navigation und Footer sichtbar
- keine sichtbaren kaputten Medien
- keine unerwarteten Tracking-/Analytics-Requests im Network-Panel

### 5. Repo-Dokumente nachziehen

Nur wenn der Browser-Check grün ist:

- `INDEX_TEST_BADGE_MANUAL_PATCH.md` als erledigt markieren oder löschen.
- `PUBLIC_PRELIVE_AUDIT_2026-06-29.md` aktualisieren.
- `GO_LIVE_REMAINING_CHECKLIST.md` aktualisieren.
- Optional Drive-Checkliste aktualisieren.

### 6. Blockierte Dokumentationspunkte entscheiden

Diese Dateien wurden bisher blockiert und können morgen kleiner oder manuell angelegt werden:

- `PUBLIC_SEMANTIC_ACCESSIBILITY_AUDIT_2026-06-29.md`
- `CSV_IMPORT_READINESS_AUDIT_2026-06-29.md`

### 7. Entscheidungen einholen

Vor echtem LIVE-Deployment müssen geklärt werden:

- Server-/Hostingdaten
- STAGING- und LIVE-Zielpfade
- HTTPS und Redirects
- Rollback
- Impressum und Datenschutz
- Feedback-Formular
- Bild-/Medienrechte
- Tracking

### 8. Kein vorschnelles LIVE

Kein LIVE-Deployment, solange fehlen:

- finale Serverdaten
- finale rechtliche Prüfung
- finale Formularentscheidung
- Badge-Entfernung plus Browser-Check
- STAGING/LIVE-Admin-Test

## Definition fertig für morgen

Der morgige manuelle Block ist erst abgeschlossen, wenn:

- `index.html` keinen Test-Badge mehr enthält
- GitHub Pages ohne sichtbaren Test-Badge geprüft wurde
- Repo-Dokumente nicht mehr widersprüchlich sind
- offene Entscheidungen im Entscheidungsregister aktuell sind
