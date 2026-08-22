# FileMaker Event Intake V1

## Architektur und Grenze

FileMaker sendet ausschließlich Operation und Event-JSON per HTTPS an GitHub Actions. Der Workflow validiert die Daten, rekonstruiert den aktuellen Eventbestand aus `main`, wendet Upsert oder Remove an, regeneriert den bestehenden Monthly Event Storage und erzeugt höchstens einen kontrollierten Draft-PR. Bei `sync-pr` mit echten Änderungen prüft der GitHub-Workflow diesen konkreten PR anschließend erneut, mergt ihn SHA-gebunden und startet den bestehenden Staging-Deploy-Workflow mit dem verifizierten Merge-SHA.

```text
FileMaker → workflow_dispatch → Validierung → Monthly Event Storage → Draft PR → Sicherheitsgates → SHA-gebundener Merge → SHA-geprüfter Staging-Deploy-Dispatch
```

FileMaker schreibt weder GitHub Contents noch `main`, kennt keine Monats-/Indexdateien, mergt keinen PR und deployt nicht selbst. Diese kontrollierten Schritte übernimmt ausschließlich der GitHub-Workflow für `sync-pr` und ausschließlich für den konkreten `automation/filemaker-event/*`-PR. `validate-only` bleibt vollständig read-only; No-change erzeugt weder Merge noch Deployment.

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

Mit der in der Vorlage verwendeten GitHub REST API Version `2026-03-10` erwarten wir bei erfolgreichem **Create a workflow dispatch event** HTTP 200 mit einer Run-Response:

Referenz: [GitHub REST API – Create a workflow dispatch event](https://docs.github.com/en/rest/actions/workflows?apiVersion=2026-03-10#create-a-workflow-dispatch-event).

```json
{
  "workflow_run_id": 123456789,
  "run_url": "https://api.github.com/repos/teuberleipzig-cpu/Tille/actions/runs/123456789",
  "html_url": "https://github.com/teuberleipzig-cpu/Tille/actions/runs/123456789"
}
```

FileMaker speichert mindestens `workflow_run_id` in `WebsiteLastRunID` und bevorzugt `html_url` in `WebsiteLastRunURL`, damit der Lauf direkt geöffnet werden kann. Die Response muss mindestens eine Run-ID oder HTML-URL enthalten. Fehlen beide trotz erfolgreichem HTTP-Aufruf, wird `WebsiteLastError` gesetzt und keine Erfolgsmeldung angezeigt.

Direkt nach **Aus URL einfügen** erfasst ein einzelner `JSONSetElement`-Schritt `Get ( LastError )` und `Get ( LastErrorDetail )`; dazwischen darf kein anderer Scriptschritt liegen. Fehler werden in `WebsiteLastError` gespeichert. Nach validierter Run-Response setzt FileMaker `WebsiteLastRunID`, `WebsiteLastRunURL` und `WebsiteLastSentAt`, leert `WebsiteLastError` und meldet ausschließlich: **GitHub-Workflow wurde gestartet.** Das Ergebnis ist anschließend im verlinkten GitHub-Actions-Lauf zu prüfen.

Wird eine neue `WebsiteEventID` per `Get ( UUID )` erzeugt, muss FileMaker den Datensatz vor dem Netzwerkaufruf mit **Commit Records/Requests** speichern und den Commit-Fehler unmittelbar prüfen. Bei einem Commit-Fehler wird das Script ohne Dispatch beendet. Dadurch bleibt dieselbe ID beim Retry erhalten und eine bereits gesendete ID kann nicht durch Verwerfen eines uncommitteten Datensatzes verloren gehen.

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

K. erzeugten Draft-PR und dessen GitHub-Actions-Lauf öffnen.

L. ausschließlich erwartete Event-Storage-Diffs prüfen.

M. Sicherheitsgates, Expected-Head-SHA-Merge und `origin/main`-Verifikation im Lauf prüfen.

N. expliziten, mit `expected_sha` geschützten Dispatch von `docker-publish.yml` prüfen.

O. `www-test.distillery.de` prüfen.

Vor dem echten Senden zuerst `validate-only`. Ein realer End-to-End-Test mit automatischem Merge und Staging-Deployment darf erst nach bewusster Aktivierung der Workflow-Änderung erfolgen.

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
- Auto-Merge ausschließlich für den konkret erzeugten `automation/filemaker-event/* → main`-PR
- frische PR-Prüfung von Status, Base, Head Branch, Head SHA und tatsächlichen Changed Files vor Ready
- erneute PR- und `main`-Prüfung nach Ready; Merge über GitHub REST mit erwartetem Event-Head-SHA
- Deployment nur nach verifiziertem Merge-SHA und `origin/main == merge_sha`
- expliziter Dispatch von `docker-publish.yml` auf `main` mit `expected_sha=merge_sha`
- jeder Fehler beendet den Ablauf ohne nachfolgenden Merge oder Deploy-Dispatch
