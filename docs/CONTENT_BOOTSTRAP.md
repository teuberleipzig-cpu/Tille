# B1b-1: Content-Branch Bootstrap Tooling

Ausgangspunkt: `e2616b39a877bd95e71859a5a1250ab74e8085d5`.
Dieses Paket implementiert ausschließlich lokale Dry-Runs und Validierungs-/Buildpläne.
Keine Content-Branches, echten Content-Commits, Writes, Pushes oder Deployments durch
das Tool. Der separate Featurebranch/Draft-PR ist der Entwicklungsablauf.

## Bestehende Contracts und Module

Environment, Ref, Scope und Revisionsidentität kommen unverändert aus den vier
B1a-Modulen. Keine zweite Pfadallowlist und keine Workflowänderung.

| Modul | Aufgabe |
| --- | --- |
| scripts/content/git-snapshot.mjs | readCommitSnapshot: lokalen Committyp, kompletten Tree und vorhandene Blobs prüfen |
| scripts/content/git-tree-hash.mjs | projectedTreeSha: reine Git-Tree-Kodierung und SHA-1-Berechnung im Speicher |
| scripts/content/content-projection.mjs | projectContent / assertContentTree: zentrale Klassifikation, Inventar, strikte Zielprüfung |
| scripts/content/bootstrap-plan.mjs | planContentBootstrap / validateContentCommit: Environmentbindung und geprüfte Snapshots |
| scripts/content/bootstrap-content-branch.mjs | ausschließlich Dry-Run-/Validation-CLI, optionale Pfad-/Blobinventare |
| scripts/content/build-plan.mjs | planContentBuild: geprüfte Revision plus Lösch-/Overlay-Plan, führt keine Komposition aus |

## CLI

Aus dem lokalen Repository, ohne Netzwerkzugriff:

```powershell
node scripts/content/bootstrap-content-branch.mjs --environment staging --source-sha e2616b39a877bd95e71859a5a1250ab74e8085d5 --dry-run
node scripts/content/bootstrap-content-branch.mjs --environment live --source-sha e2616b39a877bd95e71859a5a1250ab74e8085d5 --dry-run
```

`--inventory` ergänzt Pfade, Modi, Blob-SHAs, Klassifikation/Rule-ID sowie explizit
ausgeschlossene Pfade und deren Grund. Kein Dateitext und keine Medienbytes werden
ausgegeben. Der Standardbericht enthält Anzahl pro Regel, Mutable/Generated/Gesamt,
Environment, Zielref, Source-SHA, Source-Tree-SHA und geplanten Content-Tree-SHA.
Es gibt keine Provenienzdatei innerhalb des Content-Trees.

Für einen später existierenden Content-Commit:

```powershell
node scripts/content/bootstrap-content-branch.mjs --environment staging --content-ref content/staging --content-sha <40-lowercase-hex> --validate
```

Genau ein Modus ist erforderlich. `--write`, `--create-ref`, `--push`, unbekannte oder
doppelte Argumente scheitern. Ohne expliziten SHA gibt es keinen main/HEAD-Fallback.
Alle Sha-Eingaben werden mit dem vorhandenen Revisionscontract geprüft.
`git cat-file -t` muss exakt `commit` liefern: Tree, Blob und Annotated Tag scheitern,
auch wenn ein Tag auf einen Commit zeigt. Nicht vorhandene Objekte sind Fehler.

## Projektion und strikte Content-Validierung

Ein Code-Seed enthält zwangsläufig Code und nicht freigegebene Dateien. Entsprechend
der Projektionsregel werden diese ausgeschlossen und als CODE/UNKNOWN inventarisiert.
Unzulässige Pfadsyntax ist ebenfalls UNKNOWN, niemals eine neue Freigabe. Das ist
keine Validierung des gesamten Code-Seeds als Content-Commit.

Für den projizierten bzw. bestehenden **Content-Tree** gilt dagegen strikt FAIL:
jeder Code-, unbekannte oder Recovery-/Backuppfad, falscher Modus, fehlendes Objekt
und jede Abweichung vom vollständig rekonstruierten erlaubten Tree ist ein Fehler.
Zusätzliche leere Directory-Trees werden dadurch ebenfalls nicht still übernommen.
Strukturverzeichnisse sind nur die notwendigen Vorfahren der erlaubten Dateien.
Die Projektion generiert nichts: insbesondere kommt die komplette Sitemap exakt
aus demselben Source-Commit wie Events, News und Residents.

Der Plan enthält ausschließlich die aktuell im Source-Tree vorhandenen Dateien.
Working Tree, Index, Branchname und alte Zielbestände sind keine Datenquelle.
Ein gelöschter Pfad bleibt gelöscht. Ein leeres erlaubtes Snapshot ist technisch ein
leerer Git-Tree; das Tool behauptet damit keine redaktionelle Vollständigkeit oder
Freigabe zum Leeren einer Website. Solche Freigabegates gehören vor spätere Writes.

## Git-Plumbing, Bytes und Modes

Nur lesend: rev-parse (Objektformat/Tree), cat-file (Committyp/Blobexistenz) und
ls-tree mit `-r -t -z --full-tree`. NUL-getrennte Einträge werden vollständig gelesen;
kein Shellparsing von Pfaden, keine lokalen Checkouts oder Textkonvertierung.
Git-Umgebungsumleitungen werden entfernt; Replace-Refs und Lazy-Fetch deaktiviert.
Das Repoformat muss SHA-1 sein. Kein implizites Netzwerk-Nachladen fehlender Blobs.

Die übernommenen Dateien behalten ihren originalen Blob-SHA. Blobinhalte werden
im produktiven Tool nicht einmal durch eine Text-API gelesen. JPEG/JPG, PNG, GIF,
WEBP, AVIF, PDF und ZIP sind byteidentisch, soweit die vorhandene Scope-Regel den
jeweiligen Pfad erlaubt. Dasselbe gilt für Text einschließlich CRLF/LF.
Keine MIME-/Bilddecodierung oder Inhaltsbereinigung in diesem Paket.

Content muss `100644 blob` sein. `100755`, Symlinks `120000`, Gitlinks `160000`,
Trees an Dateipfaden und andere Modi scheitern; keine automatische Korrektur.
Code/UNKNOWN-Dateien werden beim Seed ausgeschlossen und dadurch nicht übernommen.

Die Treeberechnung kodiert die Git-Einträge als Mode + Name + NUL + binärer SHA,
verwendet Git-Verzeichnissortierung (Verzeichnisname mit Slash) und hasht den
Tree-Header samt Bytes. Das schreibt auch keine losen Git-Objekte. Gleicher
Source-SHA und gleiche Manifestversion ergeben denselben Tree, unabhängig von
Environment oder Commitzeitstempeln. Tests vergleichen mit echtem `git mktree`.
Alle schreibenden Git-Kommandos dafür laufen ausschließlich in künstlichen
temporären Testrepositories außerhalb des Projektordners und werden bereinigt.

## Bestehenden Content-Commit prüfen und Build planen

`validateContentCommit({ repoRoot, environment, contentRef, contentSha })` verlangt
die exakte Environment/Ref-Kombination und ein lokales Commitobjekt. Danach werden
der ganze Tree und alle Blobs geprüft. Ausgabe: Commit-SHA, Tree-SHA, Manifestversion,
Dateizahlen/Rule-Verteilung und optional ausgebbares Pfad-/Blobinventar.

`planContentBuild({ repoRoot, environment, contentRef, codeSha, contentSha })` prüft
beide Commits, den Content-Tree und die Environmentbindung. Artifact-ID und Buildtarget
kommen aus revision.mjs. Der Plan listet ALLE klassifizierten Contentpfade im
Code-Snapshot zum Entfernen, danach die Dateien des Content-Snapshots zum Auflegen.
Datei-/Verzeichniskollisionen mit verbleibenden Code-/ungeprüften Pfaden sind Fehler.
Kein Dockerbuild, Workspace-Write oder Refupdate findet statt.

Die Environmentbindung prüft die vorgegebene Refzuordnung, nicht die Provenienz
eines Commitobjekts. Ohne reale Content-Refs kann das Tool nicht beweisen, welche
Umgebung einen Commit erzeugt hat. B1b-2 muss den genehmigten tatsächlichen Refstand
zusätzlich überprüfen und an den gebundenen Snapshot halten. Ein formatkorrekter
Code-SHA ist ebenfalls noch kein Nachweis eines genehmigten Codereleases.

Spätere Komposition:

1. Genehmigten Code-Snapshot isoliert auschecken.
2. Alle klassifizierten Contentdateien daraus entfernen, einschließlich inzwischen
   im Content-Snapshot gelöschter Dateien.
3. Ausschließlich den validierten Content-Snapshot auflegen.
4. Prüfen, dass kein Codepfad überschrieben wurde.
5. Finalen Tree, Löschungen, Medienreferenzen und öffentliche Auslieferungsfilter prüfen.
6. Buildtarget ausschließlich aus dem Environment ableiten.
7. Image bauen.
8. Digest und code/content/environment-Provenienz dokumentieren.

Kein einfaches Copy-over. Nicht klassifizierte Code-Snapshot-Dateien werden vom Plan
nicht als Content entfernt: Recovery-/Backup-Auslieferungsfilter aus B1a bleiben
separates Aktivierungsgate, keine Behauptung eines bereits deploybaren Buildoutputs.

## Seed-Dry-Runs

Genehmigter technischer Snapshot für beide:
`e2616b39a877bd95e71859a5a1250ab74e8085d5`.

| Ergebnis | staging | live |
| --- | --- | --- |
| Zielref | content/staging | content/live |
| MUTABLE | 243 | 243 |
| GENERATED | 1578 | 1578 |
| Gesamt | 1821 | 1821 |
| Content-Tree-SHA | ec799d6d5eaec51d8633e99bf2e9d967e0f1279f | ec799d6d5eaec51d8633e99bf2e9d967e0f1279f |

Rule-Verteilung (bei beiden identisch):

| Rule-ID | Anzahl |
| --- | ---: |
| event-months | 182 |
| event-meta | 1 |
| event-manifest | 1 |
| event-index | 1 |
| event-search | 1 |
| event-pages | 1568 |
| event-media | 5 |
| residents | 1 |
| resident-images | 52 |
| resident-presskits | 0 |
| resident-pages | 3 |
| news-legacy | 1 |
| news-overview | 1 |
| news-articles | 1 |
| gallery | 1 |
| gallery-media | 0 |
| navigation | 1 |
| sitemap | 1 |

Source-Tree: `fb9abe51a529929cf495773df205aa1e3c121af9`.
Ausgeschlossen: 300 CODE und 66 UNKNOWN; darunter Root-Dokumente, nicht in B1a
klassifizierte öffentliche Code-/Assetdateien, Legacy events.json und Resident-
Recoverydateien. Diese Namen wurden geprüft, ihre Inhalte nicht ausgegeben.
Keine unerlaubten Dateien im projizierten Tree, keine Content-Mode-Blocker.

Staging: möglicher späterer Seed nur bei B1b-2 erneut explizit genehmigt und aktuell.
Live: ausschließlich TEMPORÄRER UNVERÖFFENTLICHTER Seedkandidat, nicht live-ready.
Identische Trees koppeln die Umgebungen nicht. Keine Staging→Live-Branchmerges.
Promotion erfolgt später gezielt pro geprüftem Inhalt mit neuem Zielsnapshot.

## Späterer B1b-2-Schreibvorgang (noch nicht implementiert)

Source-/Code-SHA erneut freigeben, aktuelle Ref-/Writerlage prüfen und Bootstrap nur
bei noch nicht existierendem Zielref zulassen. Projektion erneut prüfen, Tree-SHA
mit Review vergleichen, Blobs unverändert übernehmen und einen parentlosen Root-Commit
erzeugen. Provenienz außerhalb des Content-Trees dokumentieren. Zielref ausschließlich
aus Environment ableiten, atomar nur bei Nichtvorhandensein erstellen; keinen
bestehenden Ref überschreiben. Danach Tree erneut strikt prüfen. Writes/Push müssen
in diesem separaten Auftrag ausdrücklich aktiviert werden. Keine neue Content-
Metadatendatei und keine Code-/Workflowdateien in den Content-Branch aufnehmen.

Tests nutzen künstliche externe Repositories für Commit-/Mode-/Binaryfälle;
Dry-Run-Prüfungen vergleichen sämtliche Dateien einschließlich Git-Objektdatenbank
und Refs vor/nach dem CLI-Lauf. Kein echter Content-Commit wurde erzeugt.

## Ausgeführte Prüfung

`node --test tests/content-bootstrap.test.mjs tests/content-foundation.test.mjs tests/event-contract-v2.test.mjs tests/event-contract-v2-timetable.test.mjs`
ergibt 225/225 PASS: 27 Bootstrap-, 105 Foundation- und 93 V2-Tests.
Beide oben aufgeführten Seed-Dry-Runs bestanden. `git diff --check` bestanden.
Die unveränderten FileMaker-/WordPress-Workflows wurden nicht erneut diagnostisch
getestet; ihre bereits dokumentierten Windows-CRLF-Probleme bleiben unberührt.
