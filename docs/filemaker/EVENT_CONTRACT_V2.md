# Event Contract V2 — Foundation, Paket A

Status: **C1 aktiviert ausschließlich date/dates im produktiven Parser und Storage.**
Tags und Timetable bleiben Foundation-Verträge, nicht produktiv aktiviert.
Version: 2. Basis: b2b4af6182f38dcbcd6a7f508ff6ead99e03b8ed.

## Heute und später

Der bestehende Workflow-/Staging-Vertrag bleibt unverändert.
event_json akzeptiert id, date, dates, title, color, moreUrl, imageUrl, description,
status und sections (label, genre, items mit name, info, link).
Neue Events benötigen date oder dates sowie title; fm-ID bleibt stabil. Ausgelassene Felder
bleiben bei Updates erhalten, einschließlich imageUrl und unbekannter Bestandsfelder.
Gelieferte sections ersetzen die bisherige Liste vollständig.
Der produktive Parser lehnt tags, timetable und environment weiterhin ab.

Dates ist über die vorhandene Datumsnormalisierung integriert. Tags und Timetable
benötigen weiterhin ein eigenes Integrationspaket. environment gehört ausdrücklich
NICHT in event_json. C1 enthält keine sichtbare Mehrtage-UI und keinen Remote-Run.

## Umgebung: ursprünglicher Foundation-Vertrag (Routing separat umgesetzt)

Spätere Inputs: mode, operation, environment, event_json.
environment muss exakt `staging` oder `live` sein. Fehlend, leer, Leerzeichen,
abweichende Großschreibung und andere Werte sind Fehler. Kein Default.
Die Umgebung bestimmt später gemeinsam Content-Ziel, PR-/Write-Ziel,
Deployment, Berechtigungsumgebung sowie Status- und Fehlerangaben.
Paket A definiert keine Branch-, Server- oder Berechtigungszuordnung.
Die vorgeschlagenen Content-Branches müssen in B1 erst geprüft werden.
V1-Clients bleiben bis dahin unverändert; ein Übergangsvertrag wird vor
Aktivierung mit Steffen festgelegt. Fehlende Ziele dürfen nie Live bedeuten.

## Datumsliste

- Alte und neue eintägige Events dürfen ausschließlich date verwenden.
- dates ist optional, bei Lieferung ein Array mit 1–31 Strings.
- Limit gilt vor Deduplizierung; damit bleibt auch die Eingabe begrenzt.
- Außenleerzeichen entfernen, reale Kalendertage YYYY-MM-DD (0001–9999)
  prüfen, Duplikate entfernen, chronologisch sortieren.
- Lücken sind erlaubt: 16. und 18. Oktober ergänzen NICHT den 17. Oktober.
- date ist der erste Tag. Werden beide Felder geliefert, muss date passen;
  ein Widerspruch wird abgelehnt, niemals still korrigiert.
- Nur dates geliefert: der reine Patch-Helfer leitet date vom ersten Tag ab.
- dates fehlt: vorhandene dates erhalten; keine Liste automatisch anlegen.
- dates geliefert: vollständig ersetzen. [] ist ungültig.
- Rückkehr zu eintägig: dates mit genau einem Tag senden.
- Ein date-only Update eines mehrtägigen Bestands darf dessen dates nicht
  löschen. Widerspricht date der erhaltenen Liste, muss der produktive Apply-Layer
  abbrechen und die vollständige neue dates-Liste anfordern.
- Fachlicher Veranstaltungstag ist unabhängig vom Timetable: eine Freitagnacht
  bis Samstagmorgen bleibt eintägig, wenn nur Freitag ausdrücklich angegeben ist.

Der Patch-Helfer hat absichtlich keinen Bestandszugriff. Resultierende
Bestandskonsistenz, Pflichtfelder neuer Events und Monate prüft jetzt C1.
Der Browser-Storage akzeptiert nur bereits normalisierte, konsistente Listen;
kaputte persistierte Daten werden nicht still repariert. Details:
[Mehrtage-Storage](../EVENT_MULTIDATE_STORAGE.md).

## Freie Tags (weiterhin nicht produktiv aktiviert)

Array mit maximal 20 Strings (Limit vor Deduplizierung), keine Kategorien-Enum.
Jeder Tag: trimmen, Unicode NFC, höchstens 60 Unicode-Codepoints.
Leere Tags sind Fehler: versehentlich leere redaktionelle Eingaben bleiben sichtbar.
Steuer- und Formatzeichen, HTML-Winkelklammern, aktive Protokolle, Base64-Marker
und die aus V1 bekannten Secretmuster sind verboten. Fehler geben keine Werte aus.

Vergleichsschlüssel: NFC → Unicode toLowerCase → NFC. Kein sprachabhängiges
Sortieren, keine Synonyme, kein Entfernen innerer Leerzeichen oder Umlaute.
`Konzert`, `konzert`, ` Konzert ` sind ein Begriff; die erste Schreibweise im
Payload gewinnt. `PoetrySlam` und `Poetry Slam` bleiben getrennt.
Der Schlüssel ist keine umfassende Unicode-Casefold-/Synonym-Erkennung.
Der spätere Apply-Layer soll für identische Schlüssel etablierte Anzeigenamen
bewahren. Cross-Event-Anzeigenamen sind noch kein Teil dieser reinen Normalisierung.

Fehlend: bei Update erhalten; bei neuem Event fachlich keine Tags.
Geliefert: vollständig ersetzen. []: alle Tags entfernen.
Tags immer als Text ausgeben, niemals ungeprüfte CSS-Klassen oder DOM-IDs.

## Timetable (weiterhin nicht produktiv aktiviert)

Fehlend: erhalten. null: ausdrücklich entfernen. Objekt: vollständig ersetzen.
{} und {"slots":[]} sind ungültig; es gibt keinen zweiten Löschmechanismus.

Ein Objekt besitzt ausschließlich slots; 1–40 Slots, je Slot:

- start/end: YYYY-MM-DDTHH:mm:ss±HH:mm, beide erforderlich.
- Numerischer Offset erforderlich; weder Z, Bruchteile noch offsetlose Werte.
- Reales Datum und Uhrzeit, end liegt als Zeitpunkt strikt nach start.
- Offset und lokale Uhrzeit müssen laut Intl/IANA zur Zone Europe/Berlin passen.
- Herbst: beide 02:30-Uhr-Zeitpunkte mit +02:00 und +01:00 sind gültig.
- Frühjahr: die übersprungene lokale 02:30-Uhr-Zeit ist ungültig.
- floor: optional. Ein fehlendes Feld wird intern deterministisch zu `""`
  normalisiert. Wenn vorhanden, muss es ein sicherer, nichtleerer Text mit
  maximal 300 Codepoints sein; `floor: ""` und reine Whitespace-Werte sind
  ungültig. Mehrere Slots dürfen ohne Floor existieren. Eine spätere UI braucht
  Floor-Zwischenüberschriften nur bei tatsächlich vorhandenen Informationen.
- artists: 1–10 Artists, jeweils name erforderlich (300), info optional (1000),
  link optional (2000). Fehlendes info/link wird leer normalisiert.
- Links: HTTP/HTTPS ohne Credentials; keine relativen, data/blob/javascript-URLs.
- Textschutz wie bei Tags. Unbekannte Timetable-/Slot-/Artistfelder sind Fehler.

Slots werden nach Startzeitpunkt stabil sortiert; Gleichzeitigkeit erhält die
Eingabereihenfolge. Überlappungen, auch auf demselben Floor, bleiben zulässig.
Sie können später redaktionelle Warnungen erzeugen; Paket A enthält keine Warn-UI.
Artists stehen selbstständig im Slot, keine fragile Arraypositions-Verknüpfung
zum normalen Line-up. Dates verwendet später weiterhin sections; Details können
alternativ timetable rendern. Kein automatisches Ableiten weiterer Eventtage.

40 Slots begrenzen Aufwand konservativ und erlauben etwa zwei Floors mit je
20 Slots. Das garantiert NICHT, dass maximal gefüllte Texte in 40 KB passen.
Das unveränderte 40-KB-Limit gilt zusätzlich für das komplette rohe event_json
in UTF-8, einschließlich V1-Feldern, Syntax und Leerzeichen. Bei Überschreitung
Fehler, keine Kürzung und keine Teilveröffentlichung.

## Reine Helfer und spätere Apply-Grenze

scripts/filemaker/contracts-v2/ enthält ausschließlich nebenwirkungsfreie Helfer:

- validateEnvironment: exakte Allowlist, kein Routing.
- assertPayloadBudget: UTF-8-Grenze, kein vollständiger JSON-Parser.
- normalizeEventV2Patch: nur date/dates/tags/timetable; fehlende Felder bleiben
  abwesend, [] und null bleiben explizite Clear-Signale.
- normalizeDates/normalizeDatePatch, normalizeTags/tagKey,
  normalizeTimetable/berlinTimestamp: unabhängige Feldverantwortungen.

normalizeEventV2Patch ist KEIN vollständiger Eventparser. Übergabe von id, title
oder environment ist dort ein Fehler. Der produktive Parser prüft zuerst
die komplette rohe Payloadgröße und bindet ausschließlich normalizeDatePatch ein.
Die Helfer importieren keine IO-/Netzwerkfunktionen und verändern keine Eingaben.
Nur die Datumshilfe wird durch C1 produktiv importiert; Tags/Timetable bleiben isoliert.
V1-Sicherheitsmuster sind im separaten Texthelper gespiegelt und für einzeilige
Felder verschärft; V1 wird dafür nicht refaktoriert.

## Künstliches Beispiel — nicht versenden

Die Fixture tests/fixtures/event-contract-v2.json enthält getrennt environment
und event. Im späteren Dispatch wird ausschließlich event als JSON serialisiert:

```json
{
  "mode": "sync-pr",
  "operation": "upsert",
  "environment": "staging",
  "event_json": "{\"id\":\"fm-11111111-1111-4111-8111-111111111111\",\"date\":\"2026-10-16\",\"title\":\"Fixture Festival\",\"dates\":[\"2026-10-16\",\"2026-10-18\"],\"tags\":[\"Clubnacht\"]}"
}
```

Remove: operation=remove, Umgebung als eigener Input, event_json nur mit
der stabilen fm-ID. Gelieferte dates werden beim Remove ignoriert, nicht angewendet.
Remove betrifft genau diese ID; die bestehende atomare Generation entfernt alle
Monatszuordnungen sowie den einzelnen Indexeintrag, die Seite und Sitemap-URL.
Andere IDs und Umgebungen bleiben erhalten. C1 führt keinen Remote-Write aus.

## Nachfolgende Freigaben

B1: Routing, Content-Architektur, Rechte, Übergang, revisionsgebundener Deploy.
C1: Datums-Apply, Bestandsvalidierung, Mehrmonats-Storage und Rekonstruktion integriert;
keine Kalender-/Filter-UI-Integration.
C2: Apply für Tags/Timetable, etablierte Schreibweisen, Index/Renderer/Sicherheitsgates.
Jedes weitere Paket benötigt einen eigenen Auftrag. C1 hebt aktive Browser-Imports
auf event-storage-model-2 und die betroffenen Importketten auf neue Versionen.
