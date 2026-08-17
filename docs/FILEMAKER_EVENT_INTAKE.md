# FileMaker Event Intake V1

## Architektur und Grenze

FileMaker sendet ausschließlich Operation und Event-JSON per HTTPS an GitHub Actions. Der Workflow validiert die Daten, rekonstruiert den aktuellen Eventbestand aus `main`, wendet Upsert oder Remove an, regeneriert den bestehenden Monthly Event Storage und erzeugt höchstens einen kontrollierten Draft-PR.

```text
FileMaker → workflow_dispatch → Validierung → Monthly Event Storage → Draft PR → menschliche Freigabe
```

FileMaker schreibt weder GitHub Contents noch `main`, kennt keine Monats-/Indexdateien und startet kein Deployment. Der Workflow mergt und deployt ebenfalls nicht.

## GitHub-Endpunkt und Token

```text
POST https://api.github.com/repos/teuberleipzig-cpu/Tille/actions/workflows/filemaker-event-intake.yml/dispatches
```

Fine-Grained Personal Access Token für den ersten kontrollierten Test:

- Repository Access: **Only selected repositories → teuberleipzig-cpu/Tille**
- Repository Permission: **Actions: Read and write**
- keine Contents-, Pull-Requests-, Administration-, Secrets- oder Packages-Schreibrechte
- kurze Laufzeit für den Ersttest

Das FileMaker-PAT autorisiert nur den Dispatch-Aufruf. Die getrennte Workflow-`GITHUB_TOKEN`-Berechtigung erledigt später den Draft-PR. In allen Vorlagen steht ausschließlich `<FILEMAKER_GITHUB_TOKEN>`.

Empfohlener administrativer Settings-Datensatz:

| Feld | Wert |
|---|---|
| `Website_API_URL` | obiger GitHub-Endpunkt |
| `Website_API_Token` | Fine-Grained Token, nur administrativ sichtbar |
| `Website_API_Ref` | optional, Standard `main` |

Token nicht in der Eventtabelle duplizieren, nicht im Script hardcoden, nicht anzeigen und nicht in Logs/Fehlertexte übernehmen. Nach dem Ersttest in eine dauerhafte Integrations-Credential-Strategie migrieren.

## Event-Contract

`WebsiteEventID` erhält bei leerem Feld per Auto-Enter oder Script `Get ( UUID )`. Gesendet wird:

```text
"fm-" & Lower ( WebsiteEventID )
```

Akzeptiert wird ausschließlich `fm-<uuid>`. Dadurch können `ra-*`, historische und manuell gepflegte Events weder geändert noch entfernt werden.

Minimal-Mapping:

| Website | FileMaker-Feld (Beispiel/Platzhalter) |
|---|---|
| `id` | `WebsiteEventID` mit `fm-`-Präfix |
| `date` | echtes Datumsfeld `Datum` |
| `title` | `Titel` |
| `color` | `Farbe`, Standard `orange` |
| `moreUrl` | `MehrInfosURL` |
| `imageUrl` | `BildURL` |
| `description` | `Beschreibung` |
| `sections` | zunächst `[]` |

Empfohlene Statusfelder: `WebsiteLastRunID`, `WebsiteLastRunURL`, `WebsiteLastSentAt`, `WebsiteLastError`.

ISO-Datum aus einem echten FileMaker-Datumsfeld; `Events::Datum` ist ein Platzhalter für Steffens tatsächlichen Tabellen-/Feldnamen:

```text
Year ( Events::Datum ) & "-" &
Right ( "0" & Month ( Events::Datum ) ; 2 ) & "-" &
Right ( "0" & Day ( Events::Datum ) ; 2 )
```

## Operationen

- `upsert`: Neues Event braucht `id`, `date`, `title`. Defaults: `color: orange`, leere URLs/Beschreibung, `sections: []`.
- Update: Nur gelieferte unterstützte Felder werden ersetzt. Unbekannte bestehende Felder bleiben erhalten. Weggelassenes `imageUrl`/`sections` bleibt erhalten; explizit leeres `imageUrl` leert den Wert; geliefertes `sections` ersetzt das Array vollständig.
- `remove`: Benötigt nur die `fm-*`-ID. Fehlt das Event bereits, ist die Operation ein erfolgreicher No-op.

V1-Medien: `imageUrl` ist leer, ein sicherer bestehender `public/events/media/...`-Pfad oder HTTP/HTTPS. Kein Container-Upload, Base64 oder Data-URL.

## Minimaler Verbindungstest

Zuerst ohne Line-up-Relation:

```json
{
  "id": "fm-<lowercase-uuid>",
  "date": "2026-09-12",
  "title": "<test title>",
  "color": "orange",
  "description": "<short test description>",
  "sections": []
}
```

Danach kann die produktionsnahe Struktur `moreUrl`, `imageUrl` und `sections` ergänzen. Eine Section besitzt `label`, `genre` und `items`; ein Item besitzt `name`, `info`, `link`. Steffens konkrete Tabellen- und Relationsnamen sind noch unbekannt und müssen beim Meeting eingesetzt werden—die Vorlage behauptet keine erfundenen Namen.

## Buttons und gemeinsames Subscript

- **Website – Event prüfen** → `validate-only|upsert`
- **Website – Event senden** → `sync-pr|upsert`
- optional **Website – Event entfernen** → `sync-pr|remove`

Alle Buttons rufen das gemeinsame Script **Website – Event API** mit diesem Scriptparameter auf. Die copy-nahe Umsetzung steht in [docs/filemaker/FILEMAKER_EVENT_SCRIPT_TEMPLATE.md](filemaker/FILEMAKER_EVENT_SCRIPT_TEMPLATE.md).

## Response und Fehler

Ein erfolgreicher Workflow-Dispatch liefert üblicherweise HTTP 204 ohne Run-ID im Body. Deshalb darf FileMaker nicht behaupten, der Build sei bereits erfolgreich; der Lauf wird in GitHub Actions über Repository/Workflow und Zeitpunkt geprüft. Falls GitHub künftig `workflow_run_id` oder `html_url` liefert, mit `JSONGetElement` nach `WebsiteLastRunID`/`WebsiteLastRunURL` übernehmen.

Nach **Aus URL einfügen** immer `Get ( LastError )` und `Get ( LastErrorDetail )` prüfen. Fehler in `WebsiteLastError` speichern und keine Erfolgsmeldung anzeigen. `WebsiteLastSentAt` erst nach erfolgreichem HTTP-Dispatch setzen.

## Meeting Runbook – First Connection

A. FileMaker-Settings-Felder anlegen.

B. Fine-Grained Token mit ausschließlich Actions Read/Write für Tille eintragen.

C. API-URL eintragen.

D. `WebsiteEventID` anlegen und UUID erzeugen.

E. Minimalfelder mappen; echte Tabellen-/Feldnamen bestätigen.

F. Minimal-JSON mit `sections: []` erzeugen.

G. **Website – Event prüfen** ausführen.

H. GitHub-Run des Workflows **FileMaker event intake** öffnen.

I. `Validation PASS`, Event-ID, Operation, Monate und Changed-Files prüfen.

J. **Website – Event senden** ausführen.

K. erzeugten Draft-PR öffnen.

L. ausschließlich erwartete Event-Storage-Diffs prüfen.

M. erst nach menschlicher Freigabe mergen.

N. normales Main-Deployment abwarten.

O. `www-test.distillery.de` prüfen.

Vor dem echten Senden zuerst `validate-only`. Der erste synthetische Content-PR bleibt bis zur bewussten Prüfung Draft und wird nicht automatisch gemergt.

## Workflow-Sicherheiten

- ausschließlich manueller `workflow_dispatch`
- globale Concurrency, keine parallelen Intakes
- frische Rekonstruktion aus Manifest, Meta, Event-Index und Monatsdateien auf `main`
- Output-Allowlist nur Event-Storage-JSON
- maximal ein offener `automation/filemaker-event/* → main`-PR
- gleicher Event-PR wird aktualisiert; anderer Event-PR blockiert vor Push
- `main`-SHA wird direkt vor dem ersten Write erneut geprüft
- ausschließlich event-abgeleiteter Automation-Branch und `--force-with-lease`
- No-change schließt nur den stale PR desselben Event-Branches
- kein Auto-Merge und kein Deployment
