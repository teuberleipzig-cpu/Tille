# Admin V2 Shared Sort State Status

Stand: Vorbereitung, nicht aktiv.

## Vorbereitetes Shared-Modul

| Datei | Status | Zweck |
| --- | --- | --- |
| `public/admin/js/features/shared/sort-state-module.js` | vorbereitet, nicht geladen | gemeinsame Sortierzustands-Logik für Admin-V2-Listen |

## Wichtig

Dieses Modul ist aktuell nicht in Admin V2 eingebunden.

Es gibt dadurch aktuell:

- keine Änderung an Event-Sortierung
- keine Änderung an Resident-Sortierung
- keine Änderung an Releases-Sortierung
- keine Änderung an Listen
- keine Änderung an Filtern
- keine Änderung an aktiven Eingaben
- keine Änderung an Daten-JSONs

## Spätere Verwendung

Dieses Modul darf erst aktiv eingebunden werden, wenn klar ist, welche bestehende Sortierlogik dadurch ersetzt wird.

Keine parallelen Reparatur-Layer mit Intervallen oder DOM-Observern verwenden.
