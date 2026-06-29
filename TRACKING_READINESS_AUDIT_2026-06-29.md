# Tracking Readiness Audit – 2026-06-29

Status: Repo-basierter Audit. Kein Tracking eingebaut, keine Codeänderung, keine Rechtsberatung.

## Geprüfte Bereiche

- öffentliche HTML-Seiten stichprobenartig
- `datenschutz.html`
- `LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md`
- `GO_LIVE_REMAINING_CHECKLIST.md`

## Befund

- [x] Repo-Suche nach typischen Analytics-/Tracking-Begriffen lieferte keine Treffer.
- [x] In den geprüften Head-Bereichen von `index.html` und `feedback.html` wurde kein typisches Analytics-Script gesehen.
- [x] `datenschutz.html` beschreibt Tracking nur als geplant und entscheidungspflichtig.
- [x] `LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md` markiert Tracking als nicht aktiviert/final definiert.
- [x] Der P1-Tracking-Block in der Go-Live-Checkliste ist vollständig offen.
- [x] Es wurde kein Tracking-Code ergänzt.
- [x] Es wurden keine Cookies, Fingerprints oder personenbezogenen IDs eingeführt.

## Offene Entscheidungen

- [ ] Wird Tracking zum Go-Live überhaupt aktiviert?
- [ ] Welche Events sollen gezählt werden?
- [ ] Wo werden die Tracking-Daten gespeichert?
- [ ] Werden IP-Adressen, User-Agents, Referrer oder andere technische Daten gespeichert?
- [ ] Wie wird STAGING von LIVE getrennt?
- [ ] Werden Admin V2 und Resi-Admin Tracking-Auswertungen bekommen?
- [ ] Gibt es einen CSV-Export?
- [ ] Ist ein Cookie-/Consent-Hinweis nötig?
- [ ] Datenschutzseite nach finaler Tracking-Entscheidung aktualisieren.

## Empfehlung für Go-Live

Tracking bis zur finalen Datenschutz- und Infrastrukturentscheidung deaktiviert lassen. Erst nach Klärung von Speicherort, Datenumfang, STAGING/LIVE-Trennung und Datenschutzhinweis gezielt implementieren.

## Nicht geprüft

- Kein Browser-Network-Test.
- Kein Serverlog-Test.
- Kein LIVE-Test.
- Keine Admin-V2-Auswertung.
- Keine Resi-Admin-Auswertung.

## Fazit

Aktuell ist Tracking im Repo nur als geplanter, offener Punkt dokumentiert. Das ist für den Go-Live sicherer als ein halbfertiges Tracking. Vor Aktivierung braucht es eine klare technische und datenschutzseitige Entscheidung.
