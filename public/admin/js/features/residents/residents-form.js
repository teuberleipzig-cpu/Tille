// Admin V2 Residents form module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for resident basis data reading, normalization and validation.

import { slugify, trimText } from '../../core/text.js';
import { collectErrors, required, url } from '../../core/validation.js';

export const RESIDENTS_FORM_MODULE_VERSION = 'residents-form-0';

export const RESIDENT_FORM_FIELDS = Object.freeze([
  'name',
  'slug',
  'role',
  'city',
  'country',
  'bio',
  'image',
  'website',
  'soundcloud',
  'instagram'
]);

export function createEmptyResidentDraft() {
  return {
    name: '',
    slug: '',
    role: '',
    city: '',
    country: '',
    bio: '',
    image: '',
    website: '',
    soundcloud: '',
    instagram: ''
  };
}

export function normalizeResidentFormData(value = {}) {
  const name = trimText(value.name || '');
  const slug = trimText(value.slug || '') || slugify(name || 'resident');

  return {
    ...value,
    name,
    slug,
    role: trimText(value.role || ''),
    city: trimText(value.city || ''),
    country: trimText(value.country || ''),
    bio: trimText(value.bio || ''),
    image: trimText(value.image || value.photo || value.avatar || ''),
    website: trimText(value.website || value.link || ''),
    soundcloud: trimText(value.soundcloud || ''),
    instagram: trimText(value.instagram || '')
  };
}

export function pickResidentFormData(value = {}) {
  const normalized = normalizeResidentFormData(value);
  return RESIDENT_FORM_FIELDS.reduce((acc, key) => {
    acc[key] = normalized[key] || '';
    return acc;
  }, {});
}

export function mergeResidentFormData(existing = {}, patch = {}) {
  return {
    ...(existing || {}),
    ...normalizeResidentFormData(patch || {})
  };
}

export function validateResidentFormData(value = {}) {
  const data = normalizeResidentFormData(value);
  return collectErrors(
    required(data.name, 'Name'),
    required(data.slug, 'Slug'),
    url(data.image, 'Bild-URL'),
    url(data.website, 'Website'),
    url(data.soundcloud, 'SoundCloud'),
    url(data.instagram, 'Instagram')
  );
}

export function createResidentsFormModule(options = {}) {
  let draft = normalizeResidentFormData(options.initialDraft || createEmptyResidentDraft());

  function getDraft() {
    return { ...draft };
  }

  function setDraft(nextDraft) {
    draft = normalizeResidentFormData(nextDraft || {});
    return getDraft();
  }

  function patchDraft(patch) {
    draft = mergeResidentFormData(draft, patch || {});
    return getDraft();
  }

  function validateDraft() {
    return validateResidentFormData(draft);
  }

  function resetDraft() {
    draft = createEmptyResidentDraft();
    return getDraft();
  }

  return {
    version: RESIDENTS_FORM_MODULE_VERSION,
    getDraft,
    setDraft,
    patchDraft,
    validateDraft,
    resetDraft
  };
}
