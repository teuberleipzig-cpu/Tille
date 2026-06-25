// Admin V2 shared dirty state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared changed/unchanged form state.

export const DIRTY_STATE_MODULE_VERSION = 'dirty-state-0';

export function createDirtyStateModule(options = {}) {
  let dirty = Boolean(options.initialDirty);

  function isDirty() {
    return dirty;
  }

  function markDirty() {
    dirty = true;
    return getState();
  }

  function markClean() {
    dirty = false;
    return getState();
  }

  function getState() {
    return { dirty };
  }

  return {
    version: DIRTY_STATE_MODULE_VERSION,
    isDirty,
    markDirty,
    markClean,
    getState
  };
}
