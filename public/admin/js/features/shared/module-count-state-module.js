// Admin V2 shared module count state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module count state.

export const MODULE_COUNT_STATE_MODULE_VERSION = 'module-count-state-0';

export function createModuleCountStateModule(options = {}) {
  let count = Number.isFinite(Number(options.initialCount)) ? Number(options.initialCount) : 0;

  function getCount() {
    return count;
  }

  function setCount(value) {
    count = Number.isFinite(Number(value)) ? Number(value) : 0;
    return getState();
  }

  function incrementCount() {
    count += 1;
    return getState();
  }

  function resetCount() {
    count = 0;
    return getState();
  }

  function getState() {
    return { count };
  }

  return {
    version: MODULE_COUNT_STATE_MODULE_VERSION,
    getCount,
    setCount,
    incrementCount,
    resetCount,
    getState
  };
}
