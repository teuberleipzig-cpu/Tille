# Distillery — Remaining Go-Live Checklist

Aktualisierung: 2026-10-12. Historische Prüfgrundlage: [P3 Final Pre-Live Audit vom 2026-10-08](docs/PRELIVE_P3_FINAL_AUDIT.md).
Diese Checkliste ersetzt den alten Juni-Arbeitsstand; sie erteilt keine Veröffentlichungsfreigabe.

## Verifizierter Ausgangsstand vor dem Feedback-/Privacy-Patch (2026-10-12)

- main: `1241bb496455f88db2fdb0e1ed8e20b0e102dc96`.
- content/staging: `62e18b7e40d425cd804432b0ec824e372f65823b`.
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
- Frisch über GitHub bestätigt: [PR #119 / P3](https://github.com/teuberleipzig-cpu/Tille/pull/119), [PR #120 / WordPress Pages](https://github.com/teuberleipzig-cpu/Tille/pull/120), [PR #121 / codeFallback-Guard-Hotfix](https://github.com/teuberleipzig-cpu/Tille/pull/121) und [PR #122 / About-/History-Content](https://github.com/teuberleipzig-cpu/Tille/pull/122) sind gemergt.
- [Staging-Deploy #136 / 38165434991](https://github.com/teuberleipzig-cpu/Tille/actions/runs/38165434991): completed / success auf obigem Code-SHA. P3/P4 einschließlich About/History sind damit auf Staging; kein erneuter Deploy in diesem Patch.
- Globaler Tracker bleibt **3/6 — Rechtliches finalisieren**. Weder accountseitiger Feedbackerfolg noch dieser Faktenabgleich ersetzen rechtliche Freigabe oder Live-Abnahme.

## Historischer P3-Snapshot (2026-10-08; kein heutiger Stand)

- main: `292af3767d1037ddd823908d237ec0db738f6b82` (P2 / PR #118).
- content/staging: `2b907632c17dfbeefce4fce4f70d6e63e9e9134b`.
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
- Staging: https://www-test.distillery.de/ — Deploy `37750519074` erfolgreich inklusive Remote-Verify.
- Zum damaligen Audit waren P3-Fixes noch Featurebranch-Code; dieser Veröffentlichungsstatus ist durch den Nachtrag oben überholt.

## CODE DONE / technische Nachweise aus P3 vom 2026-10-08

- [x] C1–C4-Verträge für dates[], Kategorien, Tags, kombinierte Filter und Timetable implementiert und getestet.
- [x] Staging HTTPS, noindex-Header, Disallow / und Sitemap-404 geprüft.
- [x] Positive Docker-Webroot-Grenze: interne Repositorydateien ausgeschlossen.
- [x] Öffentliche Seiten Desktop/Mobile read-only geprüft; kein TEST-BUILD-Badge.
- [x] Feedbackziel `distillery.feedback@gmail.com`; same-origin Thanks-Redirect.
- [x] Tracking deaktiviert; keine Trackingaktivierung für Launch nötig.
- [x] Event-/Resident-SEO und Sitemap-Konsistenz geprüft.
- [x] P3: Admin-Renderer-Import aus gesperrtem scripts/-Pfad in öffentlichen Shared-Modulpfad verlegt; Server-Wrapper bleibt kompatibel.
- [x] P3: Legacy event.html Legal-Footer an aktuellen Websitevertrag angeglichen.
- [x] P3: aktuelle Statusdokumentation und historische Abgrenzung korrigiert.

## P0 — BRAUCHT PHILLIP / USER / EXTERNAL/LEGAL

- [ ] Anbieter-/Adress-/Vertretungsangaben, Datenschutz und Medienrechte verbindlich abnehmen.
- [ ] Serverlog-Felder, Aufbewahrung, Zugriff, Hosting/Empfänger und reale Drittanbieter-Datenflüsse bestätigen.
- [ ] Live-Ziel, DNS/TLS, Redirects, Code-/Content-Paar, Writerpause, Rollback und explizite Cutoverfreigabe festlegen.
- [ ] Nach später autorisiertem Cutover echte Live-Abnahme durchführen. P3 veröffentlicht nichts.

## P1 — vor Launch abnehmen

- [x] P3-Merge und Staging-Deploy erfolgt (PR #119, aktueller Deploy oben). Die gezielte Remote-Nachprüfung von Admin-Import/Legacy-Footer wird hier nicht allein aus dem Runstatus als separat abgenommen behauptet.
- [ ] Gezielte Remote-Abnahme von Admin-Import/Legacy-Footer belegen, soweit noch nicht separat dokumentiert.
- [ ] STEFFEN: echte FileMaker-Staging-Sends für dates[], tags, timetable, Kombination, Update, Clear und freigegebenes Remove/Cleanup nachweisen.
- [ ] STEFFEN/USER: Testevents, mögliche RA-/FM-Dubletten und Platzhalter-Lineups fachlich entscheiden; keine automatische Datenbereinigung.
- [ ] USER: SUBMOD-Bookingziel `mailto:main` bestätigen/korrigieren lassen; keine Adresse erfinden.
- [ ] USER: Vollständigen aktuellen Feedback-E2E Browser → FormSubmit → distillery.feedback@gmail.com → Google Apps Script → Nextcloud Deck separat autorisieren und abnehmen.
- [ ] USER/PHILLIP: authentifizierte Admin-/Portal-Save-, Media-, Reload-, Konflikt- und Berechtigungs-E2Es separat freigeben.
- [ ] USER: Resident Access bleibt LOCKED; Freigabe ist kein Bestandteil von P3.

## POST-LIVE / kein aktueller Featureauftrag

- Bekannter Desktop→Mobile-Suchfokusverlust ohne Textverlust; Suche bleibt bedienbar.
- Admin-Desktopoberfläche hat auf 390px bestehenden Overflow; kein öffentlicher Mobile-Layoutfehler.
- Windows-CRLF-empfindliche historische Tests: gegen LF-Gitobjekte grün, nicht blind repariert.
- Zusätzliche Legacy-event.html-Social-Metadaten, Social-Preview-Optimierung und SEO-Kampagnen.
- WordPress About/History Pages sind auf Staging (PRs #120/#122, Deploy oben); dies ist keine pauschale rechtliche oder redaktionelle Freigabe. DE/EN und weitere Produktpakete bleiben separate Aufträge.
- Event-CSV, Trackingbackend/-Dashboard und globale Tagverwaltung sind KEINE Launchpflicht.

## Keine falschen Erledigt-Meldungen

Historischer Bestandsscan aus P3 vom 2026-10-08: 1.568 eindeutige Staging-Events; damals 0 eigene dates[]-, tags- und timetable-Felder. In diesem Patch kein erneuter Bestandsscan.
Code-/Fixturetests ersetzen deshalb keinen echten FileMaker-E2E.
In P3 war WordPress validate-only read-only erfolgreich; damals wurde keine Veröffentlichung getestet. Den späteren Stagingstand belegt der Nachtrag oben.
Keine echten Saves, Feedbacksubmission, Contentwrites, Livewrites oder Deployments in P3.

Feedback-Faktenabgleich vom 2026-10-12: Laut Nutzer funktionieren accountseitige Verarbeitung und reale Nextcloud-Deck-Kartenerstellung samt Label-/Datumsverarbeitung. Das ist eine Nutzerbestätigung, kein neuer vollständiger Browser/FormSubmit/Mail/Deck-E2E dieses Patches. Repository-Tests und lokale Browser-QA des Patches werden separat im zugehörigen PR nachgewiesen; sie ersetzen weder externe Zustellprüfung noch rechtliche/organisatorische Freigabe. Betreiber/Hosting, Zugriffe, Aufbewahrung/Löschung und Awareness-Zuständigkeit bleiben in der [Legal-/Privacy-Prüfliste](LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md) offen. Eine Kartenfälligkeit von 14 Tagen ist keine Löschfrist.

**Empfehlung: NOT READY für Live**, bis die oben zugeordneten Freigabe-/Abnahmegates geschlossen sind.
