// Admin V2 shared form draft module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared form draft handling used by Events, Residents and Releases.

export const FORM_DRAFT_MODULE_VERSION = 'form-draft-0';

export function createFormDraftModule(options = {}) {
  const createEmptyDraft = typeof options.createEmptyDraft === 'function'
    ? options.createEmptyDraft
    : () => ({});

  const normalizeDraft = typeof options.normalizeDraft === 'function'
    ? options.normalizeDraft
    : value => ({ ...(value || {}) });

  const validateDraftData = typeof options.validateDraft === 'function'
    ? options.validateDraft
    : () => [];

  let draft = normalizeDraft(options.initialDraft || createEmptyDraft());
  let dirty = false;

  function getDraft() {
    return { ...draft };
  }

  function setDraft(nextDraft) {
    draft = normalizeDraft(nextDraft || {});
    dirty = true;
    return getDraft();
  }

  function patchDraft(patch) {
    draft = normalizeDraft({ ...draft, ...(patch || {}) });
    dirty = true;
    return getDraft();
  }

  function resetDraft() {
    draft = normalizeDraft(createEmptyDraft());
    dirty = false;
    return getDraft();
  }

  function validateDraft() {
    return validateDraftData(draft);
  }

  function isDirty() {
    return dirty;
  }

  function markClean() {
    dirty = false;
    return dirty;
  }

  return {
    version: FORM_DRAFT_MODULE_VERSION,
    getDraft,
    setDraft,
    patchDraft,
    resetDraft,
    validateDraft,
    isDirty,
    markClean
  };
}
