# Post-Deploy Browser Check

Diese Checkliste gilt nach dem letzten GitHub-Pages-Deploy und später erneut nach STAGING-/LIVE-Deployment.

## Umgebung

Aktuelle Test-URL:

- `https://teuberleipzig-cpu.github.io/Tille/`

Spätere Zielumgebungen:

- STAGING: `https://teuberstaging.distillery.de/`
- LIVE: `https://www.distillery.de/`

## Direkt im Browser öffnen

- [ ] `/`
- [ ] `/residents.html`
- [ ] `/resident-releases.html`
- [ ] `/news.html`
- [ ] `/about.html`
- [ ] `/contact.html`
- [ ] `/history.html`
- [ ] `/feedback.html`
- [ ] `/impressum.html`
- [ ] `/datenschutz.html`
- [ ] `/404.html`
- [ ] `/favicon.svg`
- [ ] `/site.webmanifest`
- [ ] `/sitemap.xml`
- [ ] `/.well-known/security.txt`

## Sichtprüfung

- [ ] Kein sichtbarer `TEST BUILD / public-media-fix-4`-Badge.
- [ ] Logo sichtbar.
- [ ] Navigation sichtbar.
- [ ] Footer sichtbar.
- [ ] Adresse sichtbar.
- [ ] Impressum-Link klickbar.
- [ ] Datenschutz-Link klickbar.
- [ ] Keine offensichtlichen Layout-Brüche.

## Startseite

- [ ] Events laden.
- [ ] Kalender sichtbar.
- [ ] Suche sichtbar.
- [ ] Filter sichtbar.
- [ ] Resident-Slideshow lädt ohne kaputte Bilder.

## Residents

- [ ] Resident-Liste rechts lädt.
- [ ] Standard-Resident-Profil lädt.
- [ ] Resident-Klick funktioniert.
- [ ] Bilder laden.
- [ ] Releases laden.
- [ ] Keine sichtbaren `[object Object]`-Pfade.

## Resident Releases

- [ ] Resident-Liste rechts lädt.
- [ ] Release-Liste lädt.
- [ ] Coverbilder laden.
- [ ] Detail-/More-Funktion funktioniert, falls Releases vorhanden sind.

## Technische Direktdateien

- [ ] `favicon.svg` öffnet ohne 404.
- [ ] `site.webmanifest` öffnet ohne 404 und zeigt JSON.
- [ ] `sitemap.xml` öffnet ohne 404 und enthält `resident-releases.html`.
- [ ] `.well-known/security.txt` öffnet ohne 404.

## DevTools optional

Nur falls Zeit ist:

- [ ] Console ohne relevante Fehler.
- [ ] Network ohne relevante 404s für eigene Dateien.
- [ ] `favicon.ico`-404 nur notieren, falls Browser ihn zusätzlich automatisch anfragt; nicht kritisch, solange `favicon.svg` funktioniert.
