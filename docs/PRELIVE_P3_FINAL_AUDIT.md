# P3 Final Pre-Live Audit

Auditdatum: 2026-10-08. Scope: Code-only, Remote GET/read-only und lokale Tests.
Keine rechtliche Abnahme, kein Sicherheitszertifikat und keine Livefreigabe.
Operativer Status: P3-Fixes lokal geprüft; Draft-PR/Exact-head-CI werden im PR nachgewiesen.
**Live-Empfehlung: NOT READY**, solange die offenen Gates der Matrix nicht geschlossen sind.

## Verified snapshot

| Bindung | Verifizierter Wert |
| --- | --- |
| main / P3-Parent | `292af3767d1037ddd823908d237ec0db738f6b82` |
| content/staging | `2b907632c17dfbeefce4fce4f70d6e63e9e9134b` |
| content/live | `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a` |
| Letzter Staging-Deploy | `37750519074`, SUCCESS inklusive Build/Registry/Reload/Remote-Verify |
| Featurebranch | `codex/prelive-final-audit-p3` |

Initialer Arbeitsbaum sauber; Branch von exakt main erstellt. Read-only PR-Inventar:
nur bekannter Draft #12 offen, Auto-Merge aus; kein unerwarteter automation/* Content-PR.
#12 unverändert. P2 ist über #118 auf main. Keine Automation für P3 eingerichtet.

## Public website

Public-Baseline Desktop 1280×900 und Mobile 390×844: Dates, About, Contact,
History, News, Residents, Resident Releases, Feedback, Thanks, Gallery, Impressum,
Datenschutz geladen; sinnvolle H1s, kein öffentlicher horizontaler Overflow,
keine sichtbaren TEST-BUILD-Marker. Dynamische Leer-/Fehlerzustände nicht mit
einer erfolgreich geladenen Eventdetailseite verwechseln.

Reale Detailprobe: `/events/fm-aaa88b4b-6d78-44a2-a3aa-9745e90a3d31/`;
Resident: `/residents.html?resident=submod` sowie `/residents/submod/`.
Detail Desktop/Mobile visuell geprüft: Titel, Line-up, Footer und Back-Link sichtbar;
kein Overflow. Navigation, Freitagfilter, Suche (Erobique/Techno), Monatswechsel
auf November, Event öffnen/zurück, Resident öffnen und mobile Navigation bedient.
Seiten erneut geladen; Feedbackfelder befüllt, NICHT abgesendet.

Public-Konsole ohne beobachteten Fehler; erforderliche Referenzen zusätzlich durch
Webroot-Inventar abgesichert. Leere Slideshow-/Lightbox-img-Platzhalter ohne src
sind keine fehlgeschlagenen Netzwerkressourcen. Keine beobachteten Public-Asset-404s.
Keine Behauptung einer vollständigen redaktionellen Prüfung aller 1.568 Seiten.

Legacy `event.html` hatte alten Kurt-Eisner-Footer und tote Legal-Links: P3 korrigiert
auf den bereits vorhandenen aktuellen Websitefooter. Lokal getestet, noch nicht remote.
Keine neue fachliche Bestätigung der Adresse durch Codex.

Navigation folgt der bestehenden Config: derzeit Dates/About/Contact/History/News.
Ausgeblendete Bereiche bleiben direkt erreichbar; Ausblenden ist keine Zugriffssperre.
Contract schützt die aktivierte/verfügbare Homepage, NICHT pauschal immer Dates.
Admin-Navigation-Save bleibt staging-only. Keine Navigation geändert.

## Events / C2-C4

**CODE PASS / EXTERNAL E2E OPEN.** Read-only Scan des gebundenen Content-Snapshots:

| Metrik | Ergebnis |
| --- | ---: |
| Eindeutige Events | 1568 |
| Eigene dates[]-Felder | 0 |
| Eigene tags-Felder | 0 |
| Eigene timetable-Felder | 0 |
| Monatsplacements | 1568 |
| Monate | 182 |
| Ungültige persistierte Felder | 0 |

Manifest/Rekonstruktion gültig; neu berechneter Searchindex identisch. Keine Migration,
keine Bestandsseiten regeneriert. C2–C4-Fixture-/Contracttests sind grün, aber mangels
realer Zusatzfelder kein echter FileMaker-dates/tags/timetable-Abnahmenachweis.

Fachliche Datenfindings (nicht verändert): `2026-06-23-neues-event` am 01.11.2026
heißt **Test 3-2**; `2026-09-12-csv-test-night` heißt **CSV Test Night**.
Mögliche Dubletten im Oktober: Erobique (RA `ra-2458325` / FM
`fm-0c06851a-e414-a145-9cb4-3b568bd4167c`) und DUALISM (RA `ra-2370028` / FM
`fm-035d35f0-0337-e541-99e1-8ec1e4f69e94`). Fachlich entscheiden, nicht automatisch deduplizieren.
Bestehende Platzhalter im Line-up sind Redaktions-/Quellaufgaben, keine erfundenen Artistdaten.

FileMaker-Codevertrag geprüft: Upsert/Remove, omitted/replace/clear, unknown-field
preservation, staging-only Scope, Monatsstorage/Search/SEO/Sitemap, fresh SHA und
Code-/Content-Bindung. Keine echte Operation ausgeführt.

## Feedback

**WEBSITE PASS / REAL E2E OPEN.** Aktives Ziel:
`https://formsubmit.co/distillery.feedback@gmail.com`; `_next` same-origin
`feedback-thanks.html`. Keine alte Empfängeradresse/GitHub-Pages-Weiterleitung in
diesem aktiven Vertrag. Tests inklusive Redirect/Privacy grün.
FormSubmit → Gmail → Apps Script → Trello ist dokumentierter Soll-Datenfluss,
nicht durch P3 end-to-end nachgewiesen. Kein Submit, Mailboxzugriff oder Trellowrite.

## Tracking

**DISABLED / PASS.** `TRACKING_ENABLED = false`; Tests sichern ausbleibende Requests.
Runtime-Suche ergab keine zusätzliche aktive Analyticsintegration.
Externe Medien/Links und Serverlogs sind davon getrennte Privacy-Fakten.
Kein Trackingbackend, keine Aktivierung, keine neuen Cookies/Fingerprints.

## Public webroot

**BOUNDARY PASS; Admin-Kompatibilitätsfix im Branch.** GET-Negativproben auf Staging
für scripts/tests/docs/.github/docker/Root-Reports/events.json/.git/Robotsvorlagen
und interne Admin-Notizen: 404. Positive Seiten/Admin/Portal: 200.
Docker bleibt positive Allowlist; kein COPY-. und keine Freigabe von scripts/.
Die Importinventur erfasste vorher `.js`, aber nicht `.mjs`; P3 ergänzt `.mjs`
und einen Regressionstest für einen ausgeschlossenen transitiven Browserimport.
Lokale Browserprobe nutzt dieselbe positive Grenze, GET-only und form-action none.

## Admin

**CODE FIX VERIFIED LOCALLY / REMOTE FIX + REAL E2E OPEN.**
Belegte P1-Regression auf Staging: `event-image-only-save.js` importierte den
SEO-Renderer unter `/scripts/events/event-seo.mjs`, der nach P2 korrekt 404 liefert.
Das Promise der gemeinsamen Ladekette scheiterte; nicht bloß ein kosmetischer Log.

P3 verschiebt die unveränderte reine Rendererimplementierung nach
`public/site/js/event-seo.js`, mit serverseitigem Re-export am bisherigen Pfad.
Kein Node-/FS-/Writercode veröffentlicht. Renderer-Ausgabe, Save-Semantik und
Datenownership unverändert. Cachekette: renderer v1, image-only-save v6,
auto-github-load/events-meta `admin-public-renderer-1` einschließlich sekundärem Loader.
Browser Desktop/Mobile lokal: kein neuer Import-/Consolefehler; Desktop kein Overflow.
Remote hat diesen Fix noch NICHT.

Ohne Token geprüft: Umgebung verlangt Auswahl, Live deaktiviert, Eventfachdaten
FileMaker-owned, kein freies Branchrouting. Keine Saves ausgeführt.
Bestehender Admin-Overflow 475px bei 390px auch remote reproduziert; P2/POST_LIVE,
Desktopbedienung bleibt verfügbar. Keine mobile Admin-Neugestaltung in P3.
Vor echten Betriebssaves authentifizierte Fresh-state-/Media-/Konflikt-E2Es nachholen.

## Resident Portal

**READ-ONLY LOAD/CODE PASS / REAL E2E + APPROVAL OPEN.**
Portal lädt ohne eigenen beobachteten Consolefehler; ohne gültigen Zugang kein Editor.
Stagingbindung, fehlender freier Branchparameter und blockierter Livepfad geprüft.
Resident Access bleibt LOCKED/read-only; kein Unlock und keine Invite-/Codeänderung.
Login, scoped Save, Medienupload/-delete, Reload, Conflict/Permission Failure und
Actions-Rechte müssen später mit freigegebenen Testkonten geprüft werden.
Public-Datenfinding: SUBMOD Bookinglink `mailto:main`; USER muss Ziel bestätigen.
Keine Invite-/Portalwerte oder Tokens in diesem Report.

## WordPress

**READ-ONLY VALIDATE PASS.** Repositoryvariable gelesen, Quell-URL nicht in Report kopiert.
Veröffentlichte REST-Quelle GET erreichbar, JSON plausibel; published-only/source-origin
Contract geprüft. Bestehender lokaler validate-only Staging-Generator gegen gebundene
Code-/Contentstände in temporärem Output erfolgreich: `hasChanges=false`, `changedFiles=[]`.
Keine Sync-PR-Erstellung, kein Workflowdispatch, kein Publish/Contentwrite.
Echter redaktioneller Veröffentlichungs-/Lösch-E2E bleibt separate Abnahme.
About/History via Pages API bleibt zukünftige Produktarbeit.

## SEO

**TECHNICAL PASS**, mit dokumentierter Legacy-Ausnahme. Sitemap enthält 1581 URLs,
0 fehlende Zieldateien, 0 doppelte URLs. Generator-/Canonical-/Public-Headingtests grün.
Event-/Residentseiten vorhanden; Newsindex/Newsfamilie im Inventar berücksichtigt.
Rootseiten haben title/description/canonical/OG/Twitter/manifest; Legacy event.html
hat noindex,follow und reduzierte Metadaten, nicht die neue crawlbare Detailroute.
Keine erfundene Canonical für einen unbekannten Queryevent; Zusatzmetadaten P2.
404/Utility-noindex durch Tests geprüft. Staging: noindex/nofollow/noarchive,
robots Disallow / und sitemap.xml 404. Kein Live-SEO-Cutover ausgeführt.

## Legal / Privacy

**OPEN FACTS.** Seiten technisch vorhanden; P1-Feedbackdatenfluss und deaktiviertes
Tracking faktisch berücksichtigt. Das ersetzt keine Anbieter-/Rechtsprüfung.
Offen: Verantwortlicher/Adresse/Vertretung, Hosting/Logs/Löschfristen, Empfänger und
Verträge des Formular-/Mail-/Apps-Script-/Trelloflusses, externe Medien, Medienrechte.
Keine juristischen Formulierungen erfunden oder Freigabe behauptet.

## Infrastructure / Server

**STAGING DEPLOY PASS / LIVE OPEN FACTS.** Aktueller SSH-Host im Workflow ist
`containerhost01.distillery.de`; historischer Reload-Stepname ist kein Routingziel.
docker-publish: main-push oder kontrollierter Dispatch, Stagingbuild, Code-/Content-
Bindung, Registry, Reload, Remote-Verify. Kein Livefallback im aktiven Writerweg.
Dockerfile hat bewusst einen default-live Buildmodus; dieser ist KEIN ausgeführter Live-Deploy.
Live DNS/TLS/Redirects/Ziel/Digest-/Pairbindung/Rollback benötigen Phillip + Freigabe.

Workflowinventar: PR-Smoke read-only; FileMaker dispatch validate-only/sync-pr mit
staging-gebundener Content-PR-/Expected-head-Merge-/Dual-SHA-Deploykette;
WordPress dispatch validate-only oder Draft-Content-PR, kein Auto-Merge/Deploy.
environment=live als Inputmöglichkeit ist keine Livefreigabe, Guard lehnt ab.
Kein aktiver repository_dispatch/schedule-Writer gefunden. Kein unerwarteter Auto-Merge.
Zwei historische Artist-Placeholder-Workflows haben eng benannte PR-Pfadtrigger
und schreiben den PR-Head, nicht direkt main/live; spätere Archivierung separat entscheiden.
GitHub Pages deployt weiterhin separat (Baseline-Run `37750518835`); Ziel-/Stilllegungs-
entscheidung vor Live mit Phillip, nicht eigenmächtig deaktiviert.

## Findings fixed in P3

| ID | Priorität / Klasse | Ursache und enger Fix |
| --- | --- | --- |
| CODE-1 | P1 CODE_FIXABLE | Ausgeschlossener mjs-Browserimport; Shared-Renderer verschoben, Serverwrapper und Cachekette, Inventurtest erweitert. |
| CODE-2 | P1 CODE_FIXABLE | Alter Legacy-Eventfooter/tote Legal-Links; bestehenden aktuellen Footer übernommen. |
| CODE-3 | P1 CODE_FIXABLE | Operative Juni-Checkliste falsch; Fakten/Owner aktualisiert, historische Quellen klar abgegrenzt. |

Keine produktiven Daten, generierten Bestandsseiten, Sitemap, Medien, Tracking,
FileMaker-Applylogik, Portalrechte oder Deploymentworkflows geändert.

## Tests and browser evidence

Exact-main Windows-Baseline: **1317 Tests, 1312 PASS, 5 FAIL, 0 SKIP**.
Fünf Fehler sind nachgewiesene CRLF-Arbeitskopieartefakte: ein Logo-Bytehash,
ein Resident-Generator-Bytevergleich, drei LF-sensitive WordPress-Workflowregexe.
Gitobjekte stimmen; semantisch normalisierter Vergleich identisch.
Exact-main in isoliertem LF-Gitexport: **1317/1317 PASS, 0 SKIP**.
Keine Gitkonfiguration geändert; nur befehlslokale Exportoptionen außerhalb des Repos.
Nach Fix relevante acht Suites: **164/164 PASS**. Drei neue Webroot/Footer-Regressionstests.
Finaler gestagter Code im isolierten LF-Export: **1320/1320 PASS, 0 FAIL, 0 SKIP**
mit Node v22.22.3. `git diff --check` PASS. Nur danach wurde diese Ergebniszeile ergänzt.
Exact-head-CI: siehe abschließenden PR-Nachweis, nicht mit Baseline verwechseln.

Remote QA: https://www-test.distillery.de/ plus oben benannte Haupt-/Detailseiten,
Desktop 1280×900 / Mobile 390×844. Lokale Fix-QA: GET-only Public-Allowlistserver
auf 127.0.0.1, Admin in beiden Viewports, Legacy-Footer/Legal-Links.
Remote Adminfehler und lokaler PASS sind getrennte Ergebnisse. Keine Tokens/Saves.
Read-only Rohzählungen/HTTP-Prüfungen liegen außerhalb Git in
`C:\dev\Tille-P3-review\audit.json`; WordPressnachweis in `wordpress.json` dort.

## Deferred non-blockers

- P2 POST_LIVE: Desktop→Mobile bei fokussierter Suche verliert Fokus an BODY;
  Text bleibt, erneutes Fokussieren/Suchen funktioniert. Keine Funktions-/Datenregression.
- P2 POST_LIVE: vorhandener mobiler Admin-Overflow; öffentlicher Mobilebereich nicht betroffen.
- P2 POST_LIVE: CRLF-sensitive historische Tests, Legacy-noindex-Metadaten,
  interne Admin-Debug/Legacy-Operatorhinweise, Archivierung enger Altworkflows.
- INFO: localhost in lokalen Environmentguards/Tests ist kein veraltetes Publicziel.
- INFO: kein aktueller TEST BUILD/public-media-fix-4-Badge; alter Checklistenpunkt widerlegt.
- INFO: keine aktive alte Feedbackadresse/Pages-Weiterleitung; historische Docs bleiben Geschichte.
- Kein Launchfeature: CSV-Events, Trackingbackend, DE/EN, WordPress About/History,
  SEO-Kampagne, globale Tags und zusätzliche CMS-/Adminfunktionen.

## Go-Live blocker matrix

| ID | Finding | Priority | Owner | Can Codex fix? | Exact action | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CODE-1 | Admin-Import | P1 | CODEX | Ja, umgesetzt | P3 reviewen; später autorisiert deployen, remote nachprüfen | Browser404 → lokaler PASS; Regressionstest | FIXED IN BRANCH |
| CODE-2 | Legacy-Legalfooter | P1 | CODEX | Ja, umgesetzt | P3 reviewen; spätere Remoteprüfung | Footer-/noindex-Test | FIXED IN BRANCH |
| CODE-3 | Staler operativer Status | P1 | CODEX | Ja, umgesetzt | P3-Doku als Quelle verwenden | Neue Checkliste/Report | FIXED IN BRANCH |
| LIVE-1 | Liveinfrastruktur/Cutover | P0 | PHILLIP | Nicht ohne Serverfakten | DNS/TLS/Redirect/Ziel, duale Bindung, Rollback nachweisen | Nur Stagingdeploy abgenommen | OPEN |
| LIVE-2 | Veröffentlichungsfreigabe | P0 | USER | Nein | Exaktes Code-/Contentpaar, Writerpause, Cutover erlauben | P3 verbietet Live | OPEN |
| LEGAL-1 | Anbieter/Privacy/Medienrechte | P0 | EXTERNAL/LEGAL | Nein | Fakten und rechtliche Freigabe bestätigen | Technische Seiten sind keine Rechtsabnahme | OPEN |
| LOGS-1 | Server-/Dienstfakten | P0 | PHILLIP | Nein | Logs, Fristen, Zugriffe, Hosting/Verträge liefern | Nicht aus Websitecode belegbar | OPEN |
| FM-1 | Reales C2–C4 E2E | P1 | STEFFEN | Nur nach separater Freigabe | Acht Operationen unten mit Reload/Artefaktbeleg | 0 reale Zusatzfelder | OPEN |
| DATA-1 | Testevents/Dubletten/Platzhalter | P1 | STEFFEN | Keine fachliche Entscheidung | IDs prüfen, Cleanup vom User genehmigen lassen | Bestandsscan/Browser | OPEN |
| DATA-2 | Booking mailto:main | P1 | USER | Nicht ohne Zieladresse | Korrekten Residentkontakt bestätigen | Public SUBMOD-Profil | OPEN |
| FEEDBACK-1 | Reales Feedback E2E | P1 | USER | Keine Submission erlaubt | Separat freigegebene Zustellung bis Trello nachweisen | Websitevertrag PASS, Backend nicht getestet | OPEN |
| WRITE-1 | Authentifizierte Admin/Portal-E2Es | P1 | USER | Nicht in read-only Audit | Testkonten/-writes/Media/Reload/Konflikte freigeben | Tokenlose QA begrenzt | OPEN |
| RIGHTS-1 | Writer-/Actions-Rechte und Portalstart | P1 | PHILLIP | Nein | Minimale Rechte und branchfreie Einladungen prüfen | Access LOCKED | OPEN |
| ACCESS-1 | Resident Access Freigabe | P1 | USER | Nein | Bewusst gesperrt starten oder separat freigeben | Kein Unlock in P3 | OPEN DECISION |

Keine unerklärte Code-P0/P1-Ursache verbleibt nach den lokalen Fixes; das ist
NICHT gleichbedeutend mit erfüllten externen Abnahmen oder Remoteveröffentlichung.

## Message inputs — Steffen

Separat autorisiertes Staging-Testfenster vereinbaren, IDs und Cleanup vorher festlegen.
Für jede Operation tatsächlichen FileMaker/MBS-Send, Resultat/Run und Code-/Content-SHA,
betroffene Monatsdateien, global eindeutigen Searchtreffer, statische Detailseite,
Sitemap und Reload prüfen; fremde Daten/Medien unverändert nachweisen.

1. A: dates[] mit mehreren aufeinanderfolgenden Tagen, möglichst Monatsgrenze.
2. B: tags, Case-/NFC-Key und etablierte Display-Schreibweise.
3. C: timetable mit/ohne Floor, mehreren Artists, Link und Cross-Midnight.
4. D: Kombination dates[] + tags + timetable; keine dates-Ableitung aus Slots.
5. E: dasselbe Event aktualisieren; ausgelassene Felder/unknown fields/Bild erhalten.
6. F: timetable=null; Property weg, Detail zeigt wieder sections.
7. G: tags=[] bewusstes Clear; Search/Filter/Detail konsistent.
8. H: ausdrücklich genehmigtes Remove/Cleanup; Monatsstorage/Search/SEO/Sitemap konsistent.

Zusätzlich Test 3-2 / CSV Test Night und RA-/FM-Dubletten fachlich entscheiden.
Keinen dieser Sends hat Codex in P3 ausgeführt.

## Message inputs — Phillip

- Live-Ziel/www-vs-apex, DNS/TLS, Redirects, Hostingpfad/Container und Cutoverplan bestätigen.
- Deploymentaccount/Forced Command, Rechte, Registry-Digest und Code-/Content-Paarbindung
  samt überprüfbarem Rollback erläutern; Staginggrenzen nicht lockern.
- Serverlogs (Felder/IPs), Speicherorte, Fristen, Zugriffsrollen, Hosting-/AV-Fakten liefern.
- Minimale GitHub Contents-/Actions-Rechte für Admin/Portal klären; reale Permission-
  und Conflict-E2Es mit separat freigegebenen Konten planen; kein freies Branchrouting.
- Historische GitHub-Pages-Auslieferung und alte Links vor Live bewusst behandeln.
- Reale FormSubmit/Gmail/Apps-Script/Trello-Konfiguration, Empfänger, Aufbewahrung und
  Zuständigkeiten mit User/Legal bestätigen, ohne Secrets in Berichten.

## User decisions

P3-Review/Merge/Deploy separat freigeben; reale E2Es und Cleanup vereinbaren;
Residentkontakt bestätigen; Portal bewusst gesperrt lassen oder separate Freigabe;
Legal-/Medienrechte einholen; Live-Paar und Cutover explizit autorisieren.
Tracking bleibt aus. Keine Nachricht an Steffen/Phillip automatisch gesendet.
Kein Contentwrite, Merge, Deploy oder Livewrite in diesem Auftrag.
