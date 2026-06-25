// Admin V2 shared module offset state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module offset state.

export const MODULE_OFFSET_STATE_MODULE_VERSION = 'module-offset-state-0';

export function createModuleOffsetStateModule(options = {}) {
  let offset = Number.isInteger(Number(options.initialOffset)) ? Math.max(0, Number(options.initialOffset)) : 0;

  function getOffset() {
    return offset;
  }

  function setOffset(value) {
    offset = Number.isInteger(Number(value)) ? Math.max(0, Number(value)) : 0;
    return getState();
  }

  function resetOffset() {
    offset = 0;
    return getState();
  }

  function getState() {
    return { offset };
  }

  return {
    version: MODULE_OFFSET_STATE_MODULE_VERSION,
    getOffset,
    setOffset,
    resetOffset,
    getState
  };
}
