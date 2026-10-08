# Distillery — Remaining Go-Live Checklist

Stand: 2026-10-08, P3. Operative Quelle: [P3 Final Pre-Live Audit](docs/PRELIVE_P3_FINAL_AUDIT.md).
Diese Checkliste ersetzt den alten Juni-Arbeitsstand; sie erteilt keine Veröffentlichungsfreigabe.

## Verifizierter Stand

- main: `292af3767d1037ddd823908d237ec0db738f6b82` (P2 / PR #118).
- content/staging: `2b907632c17dfbeefce4fce4f70d6e63e9e9134b`.
- content/live: `959212c5ad09a7c999f8aa7ea8ec8bec38eccd2a`.
- Staging: https://www-test.distillery.de/ — Deploy `37750519074` erfolgreich inklusive Remote-Verify.
- P3-Fixes sind Featurebranch-Code, nicht bereits auf Staging veröffentlicht.

## CODE DONE / technisch nachgewiesen

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

- [ ] P3-Draft prüfen; später separat Merge/Deploy autorisieren und Admin-Import/Legacy-Footer remote nachprüfen.
- [ ] STEFFEN: echte FileMaker-Staging-Sends für dates[], tags, timetable, Kombination, Update, Clear und freigegebenes Remove/Cleanup nachweisen.
- [ ] STEFFEN/USER: Testevents, mögliche RA-/FM-Dubletten und Platzhalter-Lineups fachlich entscheiden; keine automatische Datenbereinigung.
- [ ] USER: SUBMOD-Bookingziel `mailto:main` bestätigen/korrigieren lassen; keine Adresse erfinden.
- [ ] USER: Feedback-E2E FormSubmit → Gmail → Apps Script → Trello separat autorisieren und abnehmen.
- [ ] USER/PHILLIP: authentifizierte Admin-/Portal-Save-, Media-, Reload-, Konflikt- und Berechtigungs-E2Es separat freigeben.
- [ ] USER: Resident Access bleibt LOCKED; Freigabe ist kein Bestandteil von P3.

## POST-LIVE / kein aktueller Featureauftrag

- Bekannter Desktop→Mobile-Suchfokusverlust ohne Textverlust; Suche bleibt bedienbar.
- Admin-Desktopoberfläche hat auf 390px bestehenden Overflow; kein öffentlicher Mobile-Layoutfehler.
- Windows-CRLF-empfindliche historische Tests: gegen LF-Gitobjekte grün, nicht blind repariert.
- Zusätzliche Legacy-event.html-Social-Metadaten, Social-Preview-Optimierung und SEO-Kampagnen.
- WordPress About/History Pages, DE/EN und weitere Produktpakete benötigen separate Aufträge.
- Event-CSV, Trackingbackend/-Dashboard und globale Tagverwaltung sind KEINE Launchpflicht.

## Keine falschen Erledigt-Meldungen

1.568 eindeutige Staging-Events; aktuell 0 eigene dates[]-, tags- und timetable-Felder.
Code-/Fixturetests ersetzen deshalb keinen echten FileMaker-E2E.
WordPress validate-only war read-only erfolgreich; keine Veröffentlichung getestet.
Keine echten Saves, Feedbacksubmission, Contentwrites, Livewrites oder Deployments in P3.

**Empfehlung: NOT READY für Live**, bis die oben zugeordneten Freigabe-/Abnahmegates geschlossen sind.
