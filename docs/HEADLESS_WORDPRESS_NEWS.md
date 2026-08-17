# Headless WordPress News Foundation

## Zielarchitektur

WordPress ist ausschließlich das zukünftige Redaktionssystem. `scripts/news/wordpress-client.mjs` liest veröffentlichte Beiträge beim Sync/Build, `news-model.mjs` normalisiert sie und der Generator schreibt statische First-Party-Seiten. Öffentliche Browser fragen WordPress nicht ab; die erzeugte Website bleibt auch bei einem WordPress-Ausfall vollständig lesbar.

## Modell und Build

Das interne Modell enthält Source-ID, sicheren Slug, Status, Titel, Excerpt, sanitizten Content, Veröffentlichungs-/Änderungsdatum, optionales Featured Image sowie deterministisch sortierte Kategorien und Tags.

Offline mit Fixture/Input-Datei:

```text
node scripts/news/generate-news.mjs --input tests/fixtures/wordpress-posts.json --out <zielverzeichnis>
```

Zukünftiger REST-Modus:

```text
WORDPRESS_BASE_URL=https://cms.example.org node scripts/news/generate-news.mjs --wordpress --out <zielverzeichnis>
```

Der produktive leere Zustand wird mit `--empty` erzeugt. Der Generator rendert zuerst vollständig in ein temporäres Verzeichnis, validiert den Output und veröffentlicht anschließend mit Backup/Rollback. Fehler vor oder während der Veröffentlichung dürfen keinen halben Artikelbestand hinterlassen.

## Output und Hosting

- `news/index.html`: kanonische Übersicht unter `/news/`
- `news/<slug>/index.html`: kanonischer Artikel unter `/news/<slug>/`
- `news.html`: generatorverwalteter kompatibler Legacy-Einstieg

Committed Directory-Indizes funktionieren sowohl auf GitHub Pages als auch über das bestehende Nginx-`try_files $uri $uri/ =404`. Unbekannte Slugs besitzen keine Datei und liefern 404. Die zentrale Site-Navigation bleibt aktiv; `data-site-page="news"` kennzeichnet verschachtelte News-Seiten eindeutig.

## Sicherheit

Nur `publish` wird übernommen. IDs und Slugs müssen eindeutig sein; Slugs erlauben ausschließlich kleine ASCII-Buchstaben, Ziffern und interne Bindestriche. Plaintext-Felder werden dekodiert und beim Rendering escaped. WordPress-Content durchläuft einen deterministischen Tokenizer mit enger Tag-/Attribut-Allowlist. Scripts, Iframes, Formulare, Event-Handler sowie `javascript:`, `data:` und `blob:` werden entfernt. Externe `_blank`-Links erhalten `noopener noreferrer`.

Featured Images akzeptieren in V1 nur HTTP/HTTPS und können bewusst externe Media-URLs bleiben. Base64/Data-URLs sind verboten. Eine spätere Phase kann Medien lokal spiegeln, ohne das interne Modell oder die Templates neu zu entwerfen.

## Noch nicht enthalten

PR F konfiguriert keine reale WordPress-Instanz, keine Credentials, keinen Webhook, keinen Scheduler und keinen CI-Publish-Trigger. Es migriert keine echten News und zeigt produktiv nur den neutralen Empty State. Eine Folgephase kann `WORDPRESS_BASE_URL`, reale REST-Fixtures, Media-Mirroring und einen kontrollierten Publish-Trigger ergänzen.

## Kontrollierter GitHub-Sync (PR G1)

`.github/workflows/wordpress-news-sync.yml` stellt den manuellen Übergang von WordPress REST zu einem prüfbaren Content-PR her. Der Workflow besitzt ausschließlich `workflow_dispatch` und liest die öffentliche REST-Basis aus der Repository-Variable `WORDPRESS_BASE_URL`. Fehlt sie oder ist sie ungültig, endet der Lauf vor einer Netzwerkanfrage mit einer konkreten Fehlermeldung. Es werden keine WordPress-Credentials verwendet.

Der Modus `validate-only` checkt `main` aus, lädt und normalisiert veröffentlichte Posts, generiert in einem temporären Verzeichnis und führt Tests sowie Sicherheitsgates aus. Seine GitHub-Berechtigung ist auf `contents: read` begrenzt; er erstellt weder Branch, Commit noch PR.

Der Modus `sync-pr` beginnt ebenfalls immer beim aktuellen `main`. Nach erfolgreicher temporärer Generierung darf er ausschließlich `news.html`, `news/index.html` und `news/<slug>/index.html` in den Arbeitsbaum übernehmen. Der Diff weist hinzugefügte, aktualisierte und entfernte Slugs aus. Ein leerer Diff beendet den Lauf erfolgreich ohne Commit oder PR-Aktualisierung. Andernfalls wird ausschließlich der Automation-Branch `automation/wordpress-news-sync` mit `--force-with-lease` aktualisiert. Ein vorhandener offener Sync-PR wird wiederverwendet; sonst entsteht ein neuer Draft-PR gegen `main`. Concurrency verhindert parallele Schreibläufe auf diesen Branch.

Der Sync führt weder Auto-Merge noch Deployment aus. Erst menschliche Prüfung und ein späterer expliziter Merge lösen den bestehenden Deployment-Weg aus. Der PR-Body enthält nur Quelle, Zählwerte, Slug-Diffs, Triggerzeit, Source Origin und Validierungsstatus, keine Artikelvolltexte.

Media Mirroring bleibt in V1 ausdrücklich deaktiviert. Zulässige externe HTTP-/HTTPS-Bilder bleiben referenziert; Downloads, Base64 und Data-URLs sind nicht Teil des Syncs. Diese Entscheidung wird nach dem ersten realen WordPress-Test erneut bewertet.

Nach Konfiguration der echten Repository-Variable ist zuerst ein `validate-only`-Lauf vorgesehen, danach ein kontrollierter `sync-pr`-Lauf. Ein späterer WordPress-Publish-Webhook kann denselben Sync-Prozess auslösen, wird in PR G1 aber weder als Webhook noch als `repository_dispatch`, Zeitplan oder sonstiger automatischer Trigger implementiert.
