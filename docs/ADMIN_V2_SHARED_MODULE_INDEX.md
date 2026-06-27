# Admin V2 Shared Module Index

Stand: Vorbereitung, nicht aktiv.

Diese Datei ist ein zentraler Index fuer die vorbereiteten Admin-V2-Module.

## Grundregel

Alle hier gelisteten Module sind aktuell nur vorbereitet.
Sie sind nicht in `public/admin/index.html`, `public/admin/js/admin-app.js` oder `public/admin/js/events-meta.js` eingebunden.

Dadurch gibt es aktuell keine Runtime-Aenderung an Admin V2.

## Core

- `public/admin/js/core/media-paths.js`
- `public/admin/js/core/image-preview.js`
- `public/admin/js/core/github-client.js`
- `public/admin/js/core/build-badge.js`
- `public/admin/js/core/dom.js`
- `public/admin/js/core/text.js`
- `public/admin/js/core/dates.js`
- `public/admin/js/core/state-store.js`
- `public/admin/js/core/json-store.js`
- `public/admin/js/core/validation.js`
- `public/admin/js/core/status.js`

## Feature-Platzhalter

- `public/admin/js/app.modular.js`
- `public/admin/js/features/events/events-list.js`
- `public/admin/js/features/events/events-form.js`
- `public/admin/js/features/events/events-image.js`
- `public/admin/js/features/residents/residents-list.js`
- `public/admin/js/features/residents/residents-form.js`
- `public/admin/js/features/residents/residents-media-module.js`
- `public/admin/js/features/residents/residents-news-module.js`
- `public/admin/js/features/releases/releases-list.js`
- `public/admin/js/features/releases/releases-form.js`

## Shared: Medien, Formulare, Listen

- `public/admin/js/features/shared/media-preview-module.js`
- `public/admin/js/features/shared/media-path-module.js`
- `public/admin/js/features/shared/form-draft-module.js`
- `public/admin/js/features/shared/list-state-module.js`
- `public/admin/js/features/shared/save-status-module.js`
- `public/admin/js/features/shared/dirty-state-module.js`
- `public/admin/js/features/shared/filter-state-module.js`
- `public/admin/js/features/shared/selection-state-module.js`
- `public/admin/js/features/shared/sort-state-module.js`
- `public/admin/js/features/shared/tab-state-module.js`

## Shared: Modul-Lifecycle

- `public/admin/js/features/shared/module-lifecycle-module.js`
- `public/admin/js/features/shared/module-registry-module.js`
- `public/admin/js/features/shared/module-readiness-module.js`

## Shared: Modul-Zustaende

- `public/admin/js/features/shared/module-error-state-module.js`
- `public/admin/js/features/shared/module-warning-state-module.js`
- `public/admin/js/features/shared/module-message-state-module.js`
- `public/admin/js/features/shared/module-empty-state-module.js`
- `public/admin/js/features/shared/module-loading-state-module.js`
- `public/admin/js/features/shared/module-visibility-state-module.js`
- `public/admin/js/features/shared/module-disabled-state-module.js`
- `public/admin/js/features/shared/module-count-state-module.js`
- `public/admin/js/features/shared/module-index-state-module.js`
- `public/admin/js/features/shared/module-page-state-module.js`
- `public/admin/js/features/shared/module-page-size-state-module.js`
- `public/admin/js/features/shared/module-offset-state-module.js`
- `public/admin/js/features/shared/module-limit-state-module.js`
- `public/admin/js/features/shared/module-total-state-module.js`
- `public/admin/js/features/shared/module-range-state-module.js`
- `public/admin/js/features/shared/module-query-state-module.js`
- `public/admin/js/features/shared/module-id-state-module.js`
- `public/admin/js/features/shared/module-name-state-module.js`
- `public/admin/js/features/shared/module-label-state-module.js`
- `public/admin/js/features/shared/module-title-state-module.js`
- `public/admin/js/features/shared/module-subtitle-state-module.js`
- `public/admin/js/features/shared/module-note-state-module.js`

## Bekannte Luecken

Diese Dateien sind bisher nicht angelegt oder nicht dokumentiert:

- `docs/ADMIN_V2_SHARED_MODULE_MESSAGE_STATE_STATUS.md` wurde blockiert.
- `docs/ADMIN_V2_SHARED_MODULE_LABEL_STATE_STATUS.md` wurde blockiert.
- `public/admin/js/features/shared/module-mode-state-module.js` wurde blockiert.
- `docs/ADMIN_V2_SHARED_MODULE_NOTE_STATE_STATUS.md` fehlt noch.

## Nicht anfassen ohne separate Freigabe

- `public/admin/index.html`
- `public/admin/js/admin-app.js`
- `public/admin/js/events-meta.js`
- `public/admin/js/admin-v2-current-fixes.js`
- `public/admin/js/github-media.js`
- `public/admin/js/residents-media.js`
- `public/events/data/events.json`
- `public/residents/data/residents.json`
