// Admin V2 shared module index state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module index state.

export const MODULE_INDEX_STATE_MODULE_VERSION = 'module-index-state-0';

export function createModuleIndexStateModule(options = {}) {
  let index = Number.isInteger(Number(options.initialIndex)) ? Number(options.initialIndex) : -1;

  function getIndex() {
    return index;
  }

  function setIndex(value) {
    index = Number.isInteger(Number(value)) ? Number(value) : -1;
    return getState();
  }

  function clearIndex() {
    index = -1;
    return getState();
  }

  function hasIndex() {
    return index >= 0;
  }

  function getState() {
    return { index, hasIndex: hasIndex() };
  }

  return {
    version: MODULE_INDEX_STATE_MODULE_VERSION,
    getIndex,
    setIndex,
    clearIndex,
    hasIndex,
    getState
  };
}
