# Manual Tomorrow Queue

Status: Alles, was bewusst auf morgen verschoben wurde und manuell erledigt werden soll.

## 1. `index.html` – Test-Badge entfernen

Priorität: P0 vor LIVE.

In `index.html` steht der sichtbare Test-Badge noch direkt vor dem `<script>`-Block. Morgen manuell entfernen:

```html
<div aria-hidden="true" style="position:fixed;left:6px;bottom:6px;z-index:9999;background:#000;color:#fff;border:1px solid #fff;padding:3px 5px;font:10px/1.1 Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.03em;opacity:.86;pointer-events:none">TEST BUILD<br>public-media-fix-4</div>
```

Danach committen/pushen.

Prüfung nach Deploy:

- `https://teuberleipzig-cpu.github.io/Tille/`
- Erwartung: Startseite lädt normal, aber unten links ist kein `TEST BUILD / public-media-fix-4` mehr sichtbar.

Hinweis: `residents.html` und `resident-releases.html` wurden bereits geprüft; dort war der Badge an der geprüften Stelle weg.

## 2. Drive `Tagesupdates` – optional manuell nachtragen

Der automatische Write in den Tab `Tagesupdates` wurde zweimal blockiert. Die Checklistenpunkte selbst und die Fortschrittsanalyse wurden aber erfolgreich aktualisiert.

Optional morgen in `Tagesupdates`, Zeile 2 eintragen:

| Datum | Trigger | Zusammenfassung | Abgehakte Punkte | Teilweise erledigt | Offene Blocker | Nächste Schritte | Trello-Sync-Hinweis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Drive-Update | Checkliste nach Repo-Arbeiten aktualisiert. | 10 weitere Punkte abgehakt. | Legal, STAGING/LIVE und Tracking bleiben offen. | Serverdaten und finale Rechtsprüfung fehlen. | Browser-Check und Serverdaten als nächste Schritte. | Drive aktualisiert. |

## 3. Nach manueller Badge-Entfernung: Browser-Check

Nach dem Commit/Deploy von Punkt 1 direkt prüfen:

- `https://teuberleipzig-cpu.github.io/Tille/`
- `https://teuberleipzig-cpu.github.io/Tille/residents.html`
- `https://teuberleipzig-cpu.github.io/Tille/resident-releases.html`
- `https://teuberleipzig-cpu.github.io/Tille/favicon.svg`
- `https://teuberleipzig-cpu.github.io/Tille/site.webmanifest`
- `https://teuberleipzig-cpu.github.io/Tille/sitemap.xml`

Erwartung:

- keine sichtbaren Test-Badges
- Seiten laden normal
- Navigation und Footer sichtbar
- Favicon/Manifest/Sitemap öffnen ohne 404

## 4. Danach in Repo/Drive nachziehen

Wenn Punkt 1 erledigt und geprüft ist:

- `INDEX_TEST_BADGE_MANUAL_PATCH.md` als erledigt markieren oder löschen.
- `PUBLIC_PRELIVE_AUDIT_2026-06-29.md` korrigieren, falls dort der Badge noch als vollständig entfernt steht.
- `GO_LIVE_REMAINING_CHECKLIST.md` Badge-Punkt erst dann als final erledigt stehen lassen.
- Drive-Checkliste nur dann anpassen, wenn der Browser-Check wirklich grün war.

## Nicht morgen als manueller Patch gemeint

Diese Punkte sind weiterhin offen, aber keine reinen Copy/Paste-Patches:

- Serverdaten für STAGING/LIVE klären.
- Impressum/Datenschutz final fachlich/rechtlich prüfen.
- Feedback-Formular-Zieladresse und LIVE-Weiterleitung entscheiden.
- Tracking-Konzept final entscheiden.
