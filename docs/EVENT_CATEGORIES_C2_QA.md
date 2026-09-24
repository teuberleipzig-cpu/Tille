# C2: lokale Prüfung und offene Gates

## Gebundener Stand

- Ausgangsbranch: `codex/event-multidate-storage-c1`, sauber,
  HEAD `1670605388f4136bebd6abb4964c252a18a9c7c8`.
- Feature: `codex/event-weekday-categories-c2`, neu von
  `c58ad4c60a55b132d10296390c6ab8cdd84b470e` (origin/main).
- Content/Staging: `c894e71168084e15e9914c2830aa3393f071a468`.
- Content/Live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
- Node: `v22.22.3`. Keine installierten/aktualisierten Dependencies.

## Gezielte automatisierte Tests

Jede Zeile wurde vor Änderungen und abschließend mit
`node --test tests/<Name>.test.mjs` ausgeführt; der TAP-Reporter wurde für
die Ergebniszusammenfassung explizit gewählt. Alle Exitcodes 0, keine Skips.

| Name | Baseline | Final |
| --- | ---: | ---: |
| event-contract-v2 | 46 | 46 |
| monthly-event-storage | 44 | 44 |
| event-multidate-storage | 30 | 30 |
| filemaker-event-intake | 133 | 133 |
| filemaker-staging-workspace | 6 | 7 |
| event-seo | 40 | 40 |
| staging-acceptance | 77 | 77 |
| staging-cutover-integration | 7 | 7 |
| dates-mobile | 17 | 19 |
| admin-event-image-only | 10 | 10 |
| admin-event-image-only-ui | 10 | 10 |
| admin-staging-ui | 7 | 7 |
| event-categories (neu) | – | 16 |
| **Gesamt** | **427** | **446** |

Abgedeckt: Eingabenormalisierung und strikte Bestandsprüfung, Lückenfehler ohne
Auffüllen, UTC/DST/Zeitzonen, Schaltjahr, unbekannte Felder, Update/Remove,
unveränderte Workspace-Ausgabe bei ungültigem Upsert, Schema 1, atomare
Mehrmonatsplatzierung, alle Kategorien/Farben, vollständige Bereiche,
ID-eindeutige Suche/SEO, stabile Reihenfolge, DOM-Identität/Filterzustand und
Admin-Import-/Image-only-Kompatibilität. Keine Full-Suite und kein Remote-E2E.

## Browser: tatsächliche Interaktions- und Sichtprüfung

Browser-Skill, lokale synthetische Fixtures, Desktop **1280 × 900**, Mobile
**390 × 844**. Kein GitHub-Token, keine externen schreibenden Requests.

Start aus dem Projektordner:

```powershell
node tests/helpers/serve-event-categories-fixture.mjs
```

Der Server wählt einen freien Port und gibt ihn aus. Tatsächlich geprüft:
`http://127.0.0.1:47905/index.html?month=2026-10` (PID 9680).
Quelle: `tests/helpers/event-categories-fixture.mjs`. Storage- und statische
SEO-Ausgaben werden nur im Speicher erzeugt. Kein Zugriff auf echte Contentdateien.
Nur GET erlaubt; CSP begrenzt Verbindungen auf den lokalen Origin.
Stop: **Ctrl+C** im Server-Terminal. Server und temporäre Browsertabs wurden beendet.

PASS:

- Laden, Monatswechsel vor/zurück, Monatspicker auf Desktop und Mobile.
- Cross-Month im Oktober UND November genau einmal mit `31.10.–02.11.2026`.
- Kalenderlinks für beide Novembertage; keine erfundenen Tage.
- Alle acht Kategorien im Oktober in gleicher visueller/DOM-Reihenfolge.
- Aktivieren/deaktivieren, andere Kategorien bleiben sichtbar; ungültige
  Auswahl im Folgemonat zurückgesetzt; leerer Februar ohne Buttons.
- Globale Suche außerhalb des aktiven Monats, eindeutiger Treffer, kein
  Fokusverlust während Eingabe; Löschen und Wechsel zwischen Suche/Kategorie.
- Mobile-Panel öffnen/schließen, aria-expanded und aktive Zusammenfassung.
- Responsive Layoutwechsel, Suchtext bleibt erhalten (Fokus-Ausnahme unten).
- Statische Detailnavigation/Rücklink, dynamisches `index.html?event=cross-month`
  sowie `event.html?id=cross-year`; identischer vollständiger Bereich und Farbe.
- Reload bewahrt Monats- bzw. Such-URL. Die bestehende replaceState-Semantik
  bleibt unverändert: Such-URL speichert keinen Monat, Filter keinen URL-Zustand.
- Sichtprüfung der Listendarstellung und neuen Detailseite; auch der längste
  Cross-Year-Bereich ist nicht abgeschnitten, kein horizontaler Overflow.
- Keine Console-Errors/Warnings oder fehlenden Fixture-/CSS-/Modulrequests.

**OFFEN, bereits im Ausgangscode vorhanden:** Beim Resize Desktop → Mobile mit
fokussiertem Suchinput wird der Fokus zu BODY statt zum Filter-Schalter bewegt.
Suchwert bleibt erhalten. Reproduziert auch mit unveränderten Code-Blobs aus
`c58ad4c60a55b132d10296390c6ab8cdd84b470e`, identischer lokaler Fixture:

```powershell
node tests/helpers/serve-event-categories-fixture.mjs --baseline
```

Tatsächliche Baseline-URL: `http://127.0.0.1:17430/index.html?month=2026-10`
(PID 39916, ebenfalls Ctrl+C beendet). Desktop-Suche fokussieren und ausfüllen,
danach auf Mobile wechseln: BODY aktiv, Eingabe unverändert, Panel geschlossen.
Ursache im unveränderten Owner-Zusammenspiel: `dates-mobile-layout.js` versetzt
den Controls-Knoten; danach sieht `dates-mobile-filters.js` beim Schließen nicht
mehr den zuvor fokussierten Input. Die isolierten vorhandenen Fokus-Unit-Tests
bilden diesen echten DOM-Move nicht nach. Kein nebenläufiger Layout-Fix in C2.

## Read-only-Bestandsprüfung und Schutz

Gebundene Git-Blobs aus Content/Staging per `git show <SHA>:<Pfad>` ausschließlich
im Speicher gelesen: **1.568 eindeutige Events, 182 Monatsdateien, 0 persistierte
dates-Felder**. Rekonstruktion und strengere Datumsprüfung vollständig PASS.
Keine Resident-Zugangsdaten oder vollständigen privaten Metadaten ausgegeben.

Keine Änderung an echten Event-/Residentdaten, Medien, generierten Bestandsseiten,
Sitemap, Navigation-/Gallery-/News-Content, Tracking, Workflows oder Composer.
Admin-Dateien ändern ausschließlich Import-Cacheversionen; Save-Verträge bleiben.

## Veröffentlichung bleibt ein separates Gate

Generator und neue Fixture-Ausgabe sind implementiert. **Bereits gespeicherte und
ausgelieferte Eventseiten wurden NICHT aktualisiert.** Der Composer kopiert ihre
Git-Blobs unverändert. Vor Merge ist ein separat freigegebener, SHA-gebundener
Event-HTML-Refresh mit konsistenter Code-/Content-Veröffentlichung erforderlich;
siehe `EVENT_MULTIDATE_STORAGE.md`. Dafür braucht es eine explizite Contentbranch-
Schreib- und Staging-Deploy-Freigabe, für Live eine weitere Freigabe.
Auch der reale FileMaker-Versand von dates[] bleibt offen. Keine automatische
Fortsetzung, kein Remote-Run, Merge, Auto-Merge oder Deployment durch C2.

## C2-R1: PR-CI-Abdeckung (24.09.2026)

Ausgangs-HEAD: `006b627dcae6472f2af96d0b82edb76ec534bbbe`, Draft-PR #114.
Die ursprünglichen PR-Pfadfilter erfassten keine der 30 C2-Änderungen.
Die zuvor lokal bestandenen 446 Tests waren daher kein GitHub-CI-Nachweis;
fehlende Runs sind keine fehlgeschlagenen Tests.

Der bestehende Smoke-Workflow erfasst zusätzlich die öffentlichen Einstiege,
`public/site/js/event-*.js`, die beiden C2-Styles, `scripts/events/**`, die
betroffenen Datums-/FileMaker-Modelle und Admin-Importketten sowie alle gezielten
Suites und deren relevante Fixtures/Helper. Alte Pfadfilter bleiben bestehen.
Reine Dokumentations-, Content- oder generierte Eventseitenänderungen lösen
dadurch keine zusätzliche Event-CI aus. Trigger bleibt ausschließlich
`pull_request` gegen `main`.

Alle 13 oben genannten C2-Suites laufen vollständig und jeweils einmal.
Die bisher gefilterte FileMaker-Intake-Ausführung wird durch ihre vollständige
Suite ersetzt. Composition-, Deployment-Contract-, Timetable-, Container- und
HTTP-Sicherheitsprüfungen bleiben erhalten. Rechte, exakter PR-Head-Checkout,
einmalige Staging-SHA-Bindung und isolierter Buildcontext sind unverändert.
Der DEFAULT-/LIVE-safety-Container ist weiterhin nur ein lokaler CI-Test mit
Staging-Content, kein Live-Deployment.

Tatsächlich lokal wiederholt mit Node `v22.22.3` und `node --test`:

- Workflow-Contract-Baseline: **4/4 PASS**.
- Erweiterter Composition-Workflow-Contract: **8/8 PASS**.
- Deployment-Workflow-Contract: **5/5 PASS**.
- Alle 13 gezielten C2-Suites: **446/446 PASS**, Einzelzahlen wie oben Final.
- Zusätzlich Timetable: **46/46 PASS**.
- Final insgesamt **505/505 PASS**, alle Exitcodes 0, keine Skips/Abbrüche.

Ein anfänglicher neuer Contracttest erkannte wegen zeilenübergreifendem `\s`
fälschlich verschachtelte Permissions. Auf horizontale Einrückung begrenzt;
danach bestanden. Kein Runtime-Fix erforderlich. Die neuen Tests prüfen den
tatsächlichen Triggerblock, vollständige ausführbare Testbefehle und isolierte
Negativbeispiele für die ursprüngliche Abdeckungslücke und Teil-Suite-Ausführung.

Keine erneute Browser-QA, keine lokale Docker-Abnahme und keine Full-Repo-Suite.
Der reguläre GitHub-Run wird erst nach Feature-Push am neuen Head geprüft und
separat berichtet; lokale PASS-Ergebnisse ersetzen diesen Nachweis nicht.

Nur Workflow, Workflow-Contracttest und dieser Bericht wurden in R1 geändert.
Runtime, Composer, andere Workflows, Daten und Bestandsseiten bleiben unberührt.
Unverändert offen: Bestandsseiten-Refresh samt konsistenter Code-/Content-
Veröffentlichung, separate Merge-/Staging-Deploy-Freigabe, realer FileMaker-
dates[]-Versand und das oben dokumentierte Desktop→Mobile-Fokusfinding.
