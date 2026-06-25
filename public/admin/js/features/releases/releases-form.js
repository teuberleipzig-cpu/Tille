// Admin V2 Releases form module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for release form data and drafts.

import { normalizeDateInput } from '../../core/dates.js';
import { trimText } from '../../core/text.js';
import { collectErrors, required, isoDate } from '../../core/validation.js';

export const RELEASES_FORM_MODULE_VERSION = 'releases-form-0';

export const RELEASE_FORM_FIELDS = Object.freeze([
  'title',
  'artist',
  'date',
  'label',
  'cover',
  'link',
  'description'
]);

export function createEmptyReleaseDraft() {
  return {
    title: '',
    artist: '',
    date: '',
    label: '',
    cover: '',
    link: '',
    description: ''
  };
}

export function normalizeReleaseFormData(value = {}) {
  return {
    ...value,
    title: trimText(value.title || value.name || ''),
    artist: trimText(value.artist || value.resident || ''),
    date: normalizeDateInput(value.date || value.releaseDate || ''),
    label: trimText(value.label || ''),
    cover: trimText(value.cover || value.image || value.artwork || ''),
    link: trimText(value.link || value.url || ''),
    description: trimText(value.description || value.text || '')
  };
}

export function pickReleaseFormData(value = {}) {
  const normalized = normalizeReleaseFormData(value);
  return RELEASE_FORM_FIELDS.reduce((acc, key) => {
    acc[key] = normalized[key] || '';
    return acc;
  }, {});
}

export function mergeReleaseFormData(existing = {}, patch = {}) {
  return {
    ...(existing || {}),
    ...normalizeReleaseFormData(patch || {})
  };
}

export function validateReleaseFormData(value = {}) {
  const data = normalizeReleaseFormData(value);
  return collectErrors(
    required(data.title, 'Titel'),
    required(data.artist, 'Artist'),
    isoDate(data.date, 'Datum')
  );
}

export function createReleasesFormModule(options = {}) {
  let draft = normalizeReleaseFormData(options.initialDraft || createEmptyReleaseDraft());

  function getDraft() {
    return { ...draft };
  }

  function setDraft(nextDraft) {
    draft = normalizeReleaseFormData(nextDraft || {});
    return getDraft();
  }

  function patchDraft(patch) {
    draft = mergeReleaseFormData(draft, patch || {});
    return getDraft();
  }

  function validateDraft() {
    return validateReleaseFormData(draft);
  }

  function resetDraft() {
    draft = createEmptyReleaseDraft();
    return getDraft();
  }

  return {
    version: RELEASES_FORM_MODULE_VERSION,
    getDraft,
    setDraft,
    patchDraft,
    validateDraft,
    resetDraft
  };
}
