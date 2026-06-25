# Admin V2 Shared Dirty State Status

Stand: Vorbereitung, nicht aktiv.

## Vorbereitetes Shared-Modul

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/features/shared/dirty-state-module.js` | vorbereitet, nicht geladen | gemeinsame Änderungsstatus-Logik für Admin-V2-Formulare |

## Wichtig

Dieses Modul ist aktuell nicht in Admin V2 eingebunden.

Es gibt dadurch aktuell:

- keine Änderung an Formularen
- keine Änderung an aktiven Eingaben
- keine Änderung an Speicherlogik
- keine Änderung an Warnungen
- keine Änderung an Events
- keine Änderung an Residents
- keine Änderung an Releases
- keine Änderung an Daten-JSONs

## Spätere Verwendung

Dieses Modul darf erst aktiv eingebunden werden, wenn klar ist, welche bestehende Änderungsstatus-Logik dadurch ersetzt wird.

Keine parallelen Reparatur-Layer mit Intervallen oder DOM-Observern verwenden.
