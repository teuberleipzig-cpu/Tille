# B1a: verifizierte Content-Owner

Stand: `bf2009c14b79b8792970c5e74640d7d71f289134`.
Dies ist die Belegtabelle; ausführbare Pfadregeln existieren ausschließlich in
`scripts/content/content-manifest.mjs`. Eine Endung allein ist keine Klassifikation.

| Pfad | Klasse | Verifizierter Owner / Verwendung |
| --- | --- | --- |
| public/events/data/months/YYYY-MM.json | MUTABLE | event-storage-model.js `storageArtifacts` speichert vollständige Events; FileMaker intake und Admin image-only schreiben diese Repräsentation |
| public/events/data/meta.json | MUTABLE | event-storage-model.js erhält nicht-events Top-Level-Daten; keine neu erfundene Metadataquelle |
| public/events/data/manifest.json, event-index.json, search-index.json | GENERATED | `buildEventStorage`/`storageArtifacts`; event-store.js lädt Manifest/Monate/Suche, Rekonstruktion erhält Indexreihenfolge |
| events/&lt;id&gt;/index.html | GENERATED | scripts/events/event-seo.mjs; FileMaker und Admin-Eventbild-Save rendern betroffene Seite |
| public/events/media/&lt;slug oder shared&gt;/*.jpg | MUTABLE | event-assets.js → github-media.js, JPEG-Konvertierung; shared enthält bestehendes migriertes JPEG |
| public/residents/data/residents.json | MUTABLE | auto-github-load.js, residents-news-csv-save.js und Portal core/github.js; Releases/News/Portalmetadaten liegen gemeinsam hier |
| public/residents/media/&lt;slug&gt;/photos/*.jpg, releases/*.jpg | MUTABLE | residents-media.js / releases-workflow.js / releases-core.js und Portal modules/media.js / releases.js; JPEG-Konvertierung |
| public/residents/media/&lt;slug&gt;/presskit/*.(pdf oder zip) | MUTABLE | Admin residents-media.js und Portal modules/media.js; Presskit-Upload |
| residents/&lt;id&gt;/index.html | GENERATED | scripts/residents/resident-seo.mjs / prepare-resident-seo.mjs; öffentliche Feldprojektion, kein automatischer aktueller Browser-Save-Generator |
| news.html, news/index.html, news/&lt;slug&gt;/index.html | GENERATED | scripts/news/generate-news.mjs und prepare-sync.mjs; Vorlagen sind news-render.mjs, nicht news.html |
| public/gallery/data/gallery.json | MUTABLE | features/gallery/gallery.js und gallery-save.js |
| public/gallery/media/&lt;playlist&gt;/&lt;dateiname&gt; | MUTABLE | gallery.js uploadFiles; JSON-first Delete mit Pending Queue in gallery-save.js |
| public/site/data/site-navigation.json | MUTABLE | features/site-navigation/site-navigation.js; redaktionelle Navigation, keine Codekonfiguration |
| sitemap.xml | GENERATED, geteilt | event-seo.mjs updateEventSitemap, news-seo.mjs updateNewsSitemap, resident-seo.mjs updateResidentSitemap erhalten jeweils fremde Bereiche |

WordPress-Primärtexte und dessen Medien liegen extern; Sync lädt öffentliche REST-Daten,
sanitisiert und generiert HTML. Keine aktive lokale News-JSON-/Medienkopie gefunden;
keine erfundene `public/news/**`-Freigabe. B1b muss die Quell-/Publikationszuordnung
zu staging/live separat festlegen. Externe Medien sind durch Git-contentSha allein
nicht byteweise reproduzierbar: Archivierung/Quellrevision ist ein späterer Entscheid.

Die lokalen Medien sind derzeit JPEGs. B1a erlaubt im Gallery-Owner zusätzlich die
üblichen Rasterformate jpg/jpeg/png/gif/webp/avif, keine HTML/JS/SVG-Ausgaben.
Der bestehende Gallery-Uploader prüft image/* und ist breiter, das Portal übernimmt
die Presskit-Endung. Diese neuen engeren Scope-Regeln sind noch nicht verdrahtet;
vor B1b Aktivierung müssen Formate/MIME-Prüfungen und vorhandene Referenzen abgeglichen
werden. Unbekannte Formate führen zur Abklärung, nicht zur ganzen Tree-Freigabe.

`public/residents/data/` enthält zahlreiche Recovery-Notizen, eine Backup-JSON und
Restore-Marker. Sie sind keine aktive Contentquelle, bleiben unklassifiziert/gesperrt
und werden nicht als Livecontent geseedet. Kein Inhalt dieser Dateien wurde verändert.
`public/events/data/events.json` ist kein aktiver Monthly-Storage-Output und nicht erlaubt.
`sitemap.live.xml` und robots-Dateien sind Vorlagen/Code, nicht gemeinsam mutable Content.
Generierte Seiten sind nur genau &lt;id&gt;/index.html; keine ganzen events/residents/news-Trees.

## Aktive Browser-Einstiegspunkte und B1b-Migration

Admin index.html lädt github-sync.js, admin-app.js, github-media.js, events-meta.js,
auto-github-load.js und die Navigation/Gallery-Module. auto-github-load.js bindet die
Savebuttons neu und ersetzt die globalen alten Savefunktionen. events-meta.js lädt
Residents-/Release-Erweiterungen; residents-news.js importiert den CSV-Import.
admin-v2-current-fixes.js lädt event-assets.js. Die bloße Existenz von app.modular.js
oder alten Portaldateien macht sie nicht zu aktiven Save-Ownern.
Portal index.html lädt app-coverfix.js, dieses die core- und modules-Dateien.

| Aktives Modul | Heutiger Zielmechanismus | B1b-Zielmechanismus | Risiko / zu prüfender Punkt |
| --- | --- | --- | --- |
| auto-github-load.js saveEventsStay/loadMonthlyEvents | ghBranch + eventsPath; atomic writer bindet Ref, Loader liest UI-Konfiguration | ein Operationskontext mit Environment/Ref/Content-SHA, feste Manifestpfade | UI-Wechsel zwischen Writer und frischem Loader; Snapshotkonsistenz prüfen |
| core/event-image-only-save.js | frische Daten → nur imageUrl; Monatsartefakte, Seite und ggf. Sitemap | gleiche Semantik auf gebundenem Content-Snapshot | keine stale FileMaker-Felder; Shared-Sitemap-SHA |
| auto-github-load.js saveResidentsStay/putJsonFile | ghBranch wird erfasst, residentsPath frei; leer/main gesperrt | Environmentwahl, fester residents.json-Pfad, frischer Patch | aktuell gesamtes Browser-JSON und SHA-Retry; nicht mit fresh-data Patch verwechseln |
| github-sync.js | Legacy ghValues/ghUrl lesen ghBranch, später neu gebundene Handler | auch Legacypfade dürfen Environmentbindung nicht umgehen | nur aktiven Handler zu ändern reicht als späterer Schutz nicht |
| features/residents/residents-news-csv-import.js / -save.js | ghBranch, residentsPath, frische News-Deduplizierung | Kontext binden, gleicher Environment-Snapshot | Preview/Save- und Environmentwechsel prüfen |
| github-media.js; event-assets.js; residents-media.js; releases-* | freie ghOwner/ghRepo/ghBranch; Uploads getrennt von JSON-Save | Environmentkontext auch für Upload/Delete | Medien können vor Datensave committed sein; verwaiste Uploads, falscher Zielwechsel |
| core/github-client.js | config.branch oder Default main | ausschließlich abgeleiteter Ref, kein Default | heutiger allgemeiner Main-Fallback darf später keine Fehlkonfiguration kaschieren |
| core/github-atomic-commit.js | config.branch, erwarteter HEAD, non-force update | gebundener Ref + geprüfter Snapshot | vollständiger Diff/Tree und Ref vor Write prüfen |
| features/site-navigation/site-navigation.js | ghBranch, fester JSON-Pfad | Environmentgebundener Client | lokale Navigation darf nicht in andere Umgebung gespeichert werden |
| features/gallery/gallery.js / gallery-save.js | ghBranch, feste Daten-/Medienpfade, SHA und Pending Delete | derselbe Kontext für JSON und Media Cleanup | Queue/loaded SHA nach Wechsel isolieren, JSON-first erhalten |
| Portal core/config.js | ?branch=, sonst main; ?resident= / ?invite= | explizite Environmentbindung, IDs unverändert | Default und direkte Branchlinks; keine stille Liveauswahl |
| Portal core/github.js | CONFIG.branch für Load/PUT, lokale Mainblockade | frische Daten aus gebundenem Ref | aktuelle ID-/Invite-/Unknown-Field-Guards erhalten |
| Portal core/upload.js | CONFIG.branch bei Upload/Delete; Delete-GET interpoliert Ref direkt | gleicher Kontext, korrektes Ref-Encoding überall | Slash-Refs und Upload vor Save gesondert testen |

Keine dieser aktiven Dateien wird in B1a verändert. Die oben genannten Risiken
sind konkrete B1b-Preconditions, keine Behauptung einer bereits eingebauten Absicherung.

## Aktive Automations- und Generatorowner

FileMaker: `.github/workflows/filemaker-event-intake.yml` checkt main aus,
führt scripts/filemaker/prepare-filemaker-event.mjs aus, prüft enge Storage-/Einzelseiten-
Allowlist und unveränderten main SHA, erzeugt/merged den kontrollierten Event-PR und
dispatcht docker-publish auf dem verifizierten Merge-SHA. remove entfernt auch die
betroffene Seite; andere Sitemapfamilien bleiben erhalten.

WordPress: `.github/workflows/wordpress-news-sync.yml` checkt main aus, nutzt
WORDPRESS_BASE_URL, erzeugt Draft auf automation/wordpress-news-sync gegen main.
Output-Allowlist: News-HTML und Sitemap. validate-only ohne Publikation;
sync-pr ohne Auto-Merge/Deploy. Medien bleiben extern.

Residents: scripts/residents/prepare-resident-seo.mjs liest residents.json und
vorhandene Sitemap aus demselben Workspace; der Generator erhält fremde Sitemapblöcke.
Aktuell keine Verdrahtung dieses Generators in den Browser-Resident-Save.

Deployment: `.github/workflows/docker-publish.yml`, `docker/Dockerfile` und
nginx-Konfigurationen sowie `.github/workflows/staging-container-smoke.yml` gelesen.
Repo-build kopiert derzeit den gemeinsamen Stand; staging überlagert robots/config
und entfernt Sitemap. Details und externe Grenzen: [Operationsplan](CONTENT_ENVIRONMENTS.md).
