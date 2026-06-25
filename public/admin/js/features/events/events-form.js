// Admin V2 Events form module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for event basis data reading, normalization and validation.

import { normalizeDateInput } from '../../core/dates.js';
import { trimText } from '../../core/text.js';
import { collectErrors, required, isoDate, url } from '../../core/validation.js';

export const EVENTS_FORM_MODULE_VERSION = 'events-form-0';

export const EVENT_FORM_FIELDS = Object.freeze([
  'date',
  'title',
  'subtitle',
  'venue',
  'city',
  'image',
  'link',
  'status'
]);

export function createEmptyEventDraft() {
  return {
    date: '',
    title: '',
    subtitle: '',
    venue: '',
    city: '',
    image: '',
    link: '',
    status: ''
  };
}

export function normalizeEventFormData(value = {}) {
  return {
    ...value,
    date: normalizeDateInput(value.date || ''),
    title: trimText(value.title || ''),
    subtitle: trimText(value.subtitle || ''),
    venue: trimText(value.venue || ''),
    city: trimText(value.city || ''),
    image: trimText(value.image || value.imageUrl || ''),
    link: trimText(value.link || value.url || ''),
    status: trimText(value.status || '')
  };
}

export function pickEventFormData(value = {}) {
  const normalized = normalizeEventFormData(value);
  return EVENT_FORM_FIELDS.reduce((acc, key) => {
    acc[key] = normalized[key] || '';
    return acc;
  }, {});
}

export function mergeEventFormData(existing = {}, patch = {}) {
  return {
    ...(existing || {}),
    ...normalizeEventFormData(patch || {})
  };
}

export function validateEventFormData(value = {}) {
  const data = normalizeEventFormData(value);
  return collectErrors(
    required(data.date, 'Datum'),
    required(data.title, 'Titel'),
    isoDate(data.date, 'Datum'),
    url(data.link, 'Link'),
    url(data.image, 'Bild-URL')
  );
}

export function createEventsFormModule(options = {}) {
  let draft = normalizeEventFormData(options.initialDraft || createEmptyEventDraft());

  function getDraft() {
    return { ...draft };
  }

  function setDraft(nextDraft) {
    draft = normalizeEventFormData(nextDraft || {});
    return getDraft();
  }

  function patchDraft(patch) {
    draft = mergeEventFormData(draft, patch || {});
    return getDraft();
  }

  function validateDraft() {
    return validateEventFormData(draft);
  }

  function resetDraft() {
    draft = createEmptyEventDraft();
    return getDraft();
  }

  return {
    version: EVENTS_FORM_MODULE_VERSION,
    getDraft,
    setDraft,
    patchDraft,
    validateDraft,
    resetDraft
  };
}
