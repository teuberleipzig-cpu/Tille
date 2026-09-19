# B1a: Staging/Live Content Foundation

Auditbasis: `bf2009c14b79b8792970c5e74640d7d71f289134` (PR #100 gemergt).
B1a definiert reine, noch nicht eingebundene Contracts. Es gibt keine neuen
Content-Branches, Migration, UI-Änderung, Workflow-Umschaltung oder Veröffentlichung.
FileMaker V1 ohne environment funktioniert unverändert. B1b benötigt einen
separaten Auftrag und geprüften aktuellen Stand.

## Zentrale Owner und API

- `scripts/content/environments.mjs`: eingefrorene Environment-Allowlist;
  verwendet denselben `validateEnvironment` wie PR #100, ohne Default.
- `scripts/content/content-manifest.mjs`: einzige neue maschinenlesbare
  Klassifikation (serialisierbare Regeln: exact oder tree mit relativem Muster,
  CODE/MUTABLE/GENERATED, Owner-Dateien). Kein Matching nach Dateiendung allein.
- `scripts/content/content-scope.mjs`: reine Pfadprüfung, keine I/O oder Git-API.
- `scripts/content/revision.mjs`: unveränderliche Revisionsbeschreibung.
- [Verifizierte Owner/Pfade](CONTENT_OWNERS.md): Belege und heutige Zielmechanismen.

| Environment | geplanter Content-Ref | Buildtarget | öffentlicher Host |
| --- | --- | --- | --- |
| staging | content/staging | staging | www-test.distillery.de |
| live | content/live | live | www.distillery.de |

Diese Refnamen sind nur Contract; ihre Existenz wird weder vorausgesetzt noch
hergestellt. Benutzer wählen staging/live, nie einen freien Ref als Ersatz.
Großschreibung, Whitespace, main, fehlende Werte oder freie Branchnamen scheitern.
`bindContentEnvironment(environment, contentRef)` lehnt auch einen an sich erlaubten
Ref ab, wenn er zur anderen Umgebung gehört. Die gesamte Konfiguration ist frozen.

Beispiel für spätere vertrauenswürdige Workflow-Adapter:

```js
const scope = validateContentChanges({ environment: 'staging', contentRef: 'content/staging', paths });
if (!scope.valid) throw new Error(JSON.stringify(scope.rejected));
if (scope.empty) return; // kein Commit, PR oder Deployment für diesen No-op
const revision = contentRevision({ environment: scope.environment, contentRef: scope.contentRef, codeSha, contentSha });
```

Das Ergebnis enthält jeden abgelehnten Pfad mit Index und Grund; eine gemischte
Liste ist insgesamt ungültig. Ein leeres Array ist explizit `valid: true, empty: true`.
Duplikate werden nicht still entfernt. Sparse Arrays enthalten ungültige Einträge.
Ein fehlendes/nicht-arrayförmiges `paths` und ungültige Environment/Ref-Bindungen werfen.

Nur kanonische relative POSIX-Pfade sind zulässig. Backslashes werden abgelehnt,
nicht repariert. Absolute/Drive-/UNC-Pfade, leere Segmente, Punktsegmente,
Trailing-Dots, Windows-Gerätenamen, Prozentkodierung, Steuerzeichen, Whitespace
und nicht unterstützte Zeichen scheitern. Prefix-Grenzen und vollständige relative
Tree-Muster verhindern `events-evil/`, weitere Unterordner oder Code unter Media.
Unklassifizierte Pfade bleiben gesperrt; sie werden nicht automatisch CODE oder Content.
Die CODE-Regeln bilden die geprüften Implementierungsbereiche ab, keinen vollständigen
Inventarkatalog aller historischen Repo-Dateien.

### Grenzen des Validators

Dies ist ein Pfad-/Zielcontract, keine Authentifizierung und kein Beweis für den
Inhalt eines Git-Commits. B1b muss den tatsächlichen Ref und vollständigen Diff
einschließlich Löschungen und beider Seiten einer Umbenennung selbst aus Git lesen,
nicht aus Benutzerangaben übernehmen. Ebenso nötig: normale Blob-Modi,
keine Symlinks/Submodule, Inhalts-/MIME-/Schema-Validierung, Secret-Prüfung,
Operatorrechte und unveränderte erwartete SHA vor dem atomaren Write.
Ein erlaubtes HTML-Output darf nur ein vertrauenswürdiger Generator erstellen;
die Pfadprüfung erkennt kein eingeschleustes Script im HTML oder Bildinhalt.
Keine aktuelle Workflow-Allowlist wird in B1a entfernt oder ersetzt. Diese sind
engere Operationsgates und müssen in B1b zusätzlich zur zentralen Umgebungsscope gelten.

## Ein Snapshot pro Umgebung, gemeinsame Outputs

Jede Generatorausführung bindet environment, erlaubten Ref und einen exakten
content SHA am Anfang. ALLE Eingaben, Medien, bisherigen Ausgaben und zu erhaltenden
Sitemapblöcke kommen aus diesem einen Snapshot. Code/Templates stammen ausschließlich
aus code SHA. Kein Lesen von beweglichem main oder von der anderen Umgebung während
der Operation. Nach einer konkurrierenden Änderung abbrechen und auf neuem Snapshot
erneut planen; kein alter Payload mit neuem SHA.

`sitemap.xml` gehört der Umgebung als Ganzes. Events, News und Residents ersetzen
jeweils ihren Bereich und erhalten fremde Blöcke. Ein Staging-Eventsnapshot darf
niemals mit einer Live-Sitemap oder Live-News/Residents kombiniert werden.
Generatoren auf demselben Content-Ref müssen serialisiert werden oder über denselben
erwarteten Parent-SHA konkurrierende Commits zuverlässig ablehnen. Daten, betroffene
Seiten, Löschungen und gesamte Sitemap werden gemeinsam in EINEM Commit geschrieben.

Weitere gemeinsame Artefakte: Event manifest/event-index/search-index und Monatsdaten
werden von FileMaker und Admin-Eventbild-Save geschrieben. `meta.json` und Monatsdateien
tragen Primärdaten; Indizes/Manifest sind erzeugte Repräsentationen. `event-index.json`
bewahrt zudem die dokumentweite Reihenfolge: beim Snapshot/Reload erhalten, nicht aus
beliebiger Monatsreihenfolge neu erfinden. Residents, Releases, Portal und News-CSV
teilen `residents.json`; dies ist gemeinsamer Mutable Content, kein Generated Output.
News-Übersicht `news.html` und `news/index.html` werden als Paar vom News-Owner erzeugt.

## Revision und Artifactidentität

`contentRevision` verlangt environment, passenden contentRef, codeSha und contentSha.
Beide SHAs sind volle, kleingeschriebene 40-stellige Git-SHA-1-Werte (aktuelles Repoformat).
Es gibt keine SHA-Kürzung. Buildtarget wird aus der Allowlist abgeleitet.
Identität: `<environment>-code-<40 hex>-content-<40 hex>`; maximal 102 Zeichen,
damit innerhalb des Docker-Tag-Limits. Weder Hostnamen noch Tokens werden übernommen.
Formatprüfung beweist noch nicht die Existenz oder zulässige Herkunft eines Commits.

B1b muss beide Commitobjekte und die Umgebung des Content-Refs prüfen und diese
Revisionsdaten als Buildprovenienz sichern. Ein veröffentlichtes Image-Digest muss
zusätzlich festgehalten und exakt dieses Digest ausgerollt werden. Ein Tag kann technisch
neu gesetzt werden; der Contract allein macht eine Registry nicht unveränderlich.
`latest` darf nie allein Deploymentzustand oder Ziel beider Umgebungen identifizieren.
Für byteidentische Neubauten fehlen heute außerdem gepinnte Base-Image-Digests.

## Präziser B1b-Aktivierungsplan (noch nicht ausgeführt)

1. Neuen Auftrag, aktuellen Code-SHA, Schreibpause/Koordination mit Steffen und
   verifizierte Content-Quellen festlegen. Audit-Seed-Kandidat für beide Umgebungen ist
   exakt `bf2009c14b79b8792970c5e74640d7d71f289134`. Für den inzwischen aktuellen
   Stagingbestand muss B1b einen frisch geprüften Nachfolge-SHA explizit genehmigen
   lassen, statt diesen historischen Seed blind zu verwenden. Den endgültigen Seed-SHA
   je Umgebung protokollieren; bei Bewegung stoppen und neu freigeben.
2. Je einen Content-only Initialcommit aus der zentral erlaubten Projektion dieses
   Seeds erstellen, mit eigener Root-Historie. Es bleiben nur klassifizierter Mutable
   und Generated Content sowie die dazugehörigen Medienbytes. Keine Codefiles,
   Workflows, Recovery-Backups, Portal-/Admin-Dateien oder Vorlagen übernehmen.
   Der Seed ist Herkunft, kein Merge aus main. Vollständigen Initialtree prüfen.
3. `content/staging` erhält den abgenommenen aktuellen Staging-Inhalt. Ein identischer
   Start für `content/live` wäre ausschließlich ein TEMPORÄRER, UNVERÖFFENTLICHTER Seed,
   kein abgenommener Launchbestand. Live-Deployment bleibt gesperrt, bis Testevents,
   Testnews, Gallery-/Resident-Freigaben, Medienrechte, Links und Navigation redaktionell
   geprüft und gezielt bereinigt sind. Keine Testdaten in B1a löschen.
4. Medien byteidentisch übernehmen und Hash/Referenzen prüfen; keine Base64-Migration
   oder automatische Konvertierung. Nicht unterstützte Altmedien müssen vor Aktivierung
   einzeln klassifiziert werden. Verwaiste Uploads nicht pauschal löschen.
5. Refrechte und vertrauenswürdige CI außerhalb der Content-Branches einrichten.
   Vollständigen Tree sowie jeden Änderungsdiff zentral prüfen; Operationsallowlists
   und SHA-Gates zusätzlich erhalten. Content-Branches dürfen keine ausführbaren
   Workflow-/Generatoränderungen einschleusen. CI-Code ausschließlich aus code SHA.
6. Build-Komposition in separatem temporärem Verzeichnis: Code-Snapshot nehmen,
   alle darin klassifizierten Contentartefakte entfernen, dann ausschließlich den
   validierten vollständigen Content-Snapshot auflegen. Reines Overlay wäre falsch:
   es würde gelöschte Inhalte aus main wiederbeleben. Keine Codepfade überschreiben.
   Recovery-/Backup-Dateien ausdrücklich von öffentlicher Auslieferung ausschließen.
7. Generatorfamilien gegen denselben Snapshot testen; Shared Outputs atomar committen.
   Zustands-/Konflikttests mit zwei Umgebungen und konkurrierenden Writes bestehen lassen.
   Anschließend getrennte Buildtargets und Digest-Deployments aktivieren, erst nach
   dokumentierter Infrastrukturfreigabe. Kein paralleler unsicherer main-Fallback.
8. Promotion später nur als explizite Entity-Operation: Quellumgebung/SHA, Zielumgebung/
   frischer SHA, konkrete Event-/Resident-/News-ID und benötigte Medien auswählen.
   Quelldaten projizieren, fremde Zielinhalte/unknown fields erhalten, Kollisionen prüfen,
   Zielartefakte und Ziel-Sitemap generieren, Diff abnehmen, atomar schreiben.
   Niemals Stagingbranch nach Live mergen, gesamte JSONs oder fremde Sitemaps kopieren.
   WordPress braucht dazu ebenfalls eine explizite Publikations-/Environment-Zuordnung.

## Migration der aktiven Writer

FileMaker: heute `mode`, `operation`, `event_json`, Checkout/PR-Base main,
`automation/filemaker-event/<id>`, Exact-SHA-Gates und anschließender SHA-gated
Stagingdispatch. Erst Steffens MBS/cURL auf separaten environment-Workflow-Input
umstellen und abstimmen, DANN Pflichtinput aktivieren. Fehlend ist Fehler, niemals
live. Upsert und remove nutzen identische Environmentbindung und denselben
Eventcontract; keine freien Branchinputs. Alter V1-Weg bleibt in B1a unverändert.

Admin/Portal: [Migrationstabelle](CONTENT_OWNERS.md). B1b bindet Umgebung, Ref,
Owner/Repo und Pfade vor jedem asynchronen Schritt. Daten frisch aus exakt dieser
Umgebung laden; Medienoperationen gehören dazu. Während Save Zielwechsel sperren
oder den unveränderlichen Operationskontext verwenden. Nach Wechsel neu laden,
Dirty State explizit speichern/verwerfen/Wechsel abbrechen; keine stille Übertragung.
Lokale Draft-/Cachekeys müssen ebenfalls Umgebung und Quelle enthalten.
Aktuelle Main-Schutzregeln nicht einfach durch Umbenennung des Refs umgehen.

## Deployment und SEO

Heute: docker-publish reagiert auf main (mit paths-ignore) und workflow_dispatch;
optional `expected_sha` wird vor dem Build geprüft. Tags sind `latest` und langes
`sha-...`, Buildargument explizit `DEPLOY_TARGET=staging`. Dockerfile-Default ist live.
Repo-belegtes Ziel: vps03.itlej.de, Account deploy-www-test-distillery,
Forced-Command laut Workflowkommentar `/usr/local/sbin/deploy-www-test-distillery.sh`.
Tatsächlicher Skriptinhalt, gezogener Tag/Digest, Container-/Compose-Konfiguration,
Live-VPS, Ports, DNS, TLS und Reverse-Proxy-Konfiguration: nicht dokumentiert / unbekannt.
Ein erwarteter Build-SHA beweist heute nicht, welches Digest das externe Skript zieht.

B1b: staging erhält code SHA + staging content SHA; live erhält code SHA + live
content SHA. Getrennte freigegebene Deployziele/Registryidentitäten; exaktes Digest
und Rückprüfung. Ein Stagingreload darf kein Liveziel erreichen. Live erst nach
Launch-Abnahme und externer Freigabe. Keine Infrastrukturdetails erfinden.

Staging-nginx setzt bereits `X-Robots-Tag: noindex, nofollow, noarchive`, einschließlich
Assetlocations. Stagingbuild ersetzt robots.txt und entfernt sitemap.xml; die
vorhandene Container-Smoke-Matrix prüft Staging UND Live. Live behält die produktive
Sitemap ohne Stagingheader. SEO-Templates dürfen auf Staging mit Live-Canonicals
testbar bleiben, werden aber nicht indexierbar veröffentlicht. robots.txt Disallow
allein ersetzt kein noindex für bereits bekannte URLs. Zugangsschutz ist optional
später zu entscheiden; B1a ändert keine Serverkonfiguration.

## Externe Freigaben / Preconditions

Phillip: tatsächliches VPS-Deployskript, Tag-/Digest-Verwendung, getrennte Liveziele,
Registry-/Refrechte, DNS/TLS/Proxy und Rollback verifizieren. Steffen: bestätigter
environment-Request vor Pflichtumschaltung. Redaktion: Live-Seed bereinigen und
freigeben. WordPress: getrennte Publikationsquellen oder explizite Promotion festlegen.
Technisch: Scope-/MIME-/Snapshotvalidierung, fresh-state Saves ohne stale Retry,
Generator-/Sitemap-Konflikttests, sichere Komposition mit Löschungen, gebundene
Operationskontexte, Environment-Drafts und Digest-Deployment nachweisen.
Der echte externe FileMaker-E2E-Nachweis bleibt separat; B1a dispatcht keinen Run.

## Prüfung

Gezielt: neue Content-Foundation-Tests, Event-V2-Tests sowie vorhandene FileMaker-
und WordPress-Workflowtests. Keine Remote-Saves, kein Container-Deploy.
Bekannte LF-only-Alttests auf Windows werden berichtet, nicht nebenbei korrigiert.
Nach dem Draft-PR endet dieser Einzelauftrag; B1b wird nicht automatisch gestartet.

Prüfergebnis B1a auf Windows:
- `node --test tests/content-foundation.test.mjs tests/event-contract-v2.test.mjs tests/event-contract-v2-timetable.test.mjs`: 198/198 bestanden (105 neue, 93 V2).
- `node --test tests/filemaker-event-intake.test.mjs tests/wordpress-news-sync.test.mjs`:
  223/232 bestanden; neun bestehende LF-only-Assertions scheitern mit CRLF.
  Alle neun Assertions separat gegen die unveränderten Git-Objekte bestanden;
  Working-Tree-Inhalt nach reiner CRLF-Normalisierung jeweils identisch zum Git-Objekt.
  Betroffen: Workflowtrigger/Permissions/Pflichtinput, optionaler Docker-SHA-Input
  und FileMaker-Scripttemplate-Absatz. Keine Tests geändert oder abgeschwächt.
- 1.821 getrackte Dateien in den verifizierten Contentbereichen gegen alle 18
  Contentregeln geprüft: kein unklassifizierter Pfad. Recovery-Dateien bewusst ausgeschlossen.
- Docker ist lokal nicht verfügbar; kein Container-Smoke ausgeführt. Bestehende
  Container-Smoke-Konfiguration gelesen, Deploymentdateien unverändert.
