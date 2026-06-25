// Admin V2 shared module range state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module range state.

export const MODULE_RANGE_STATE_MODULE_VERSION = 'module-range-state-0';

export function createModuleRangeStateModule(options = {}) {
  let start = Number.isFinite(Number(options.initialStart)) ? Number(options.initialStart) : 0;
  let end = Number.isFinite(Number(options.initialEnd)) ? Number(options.initialEnd) : 0;

  function getRange() {
    return { start, end };
  }

  function setRange(nextStart, nextEnd) {
    start = Number.isFinite(Number(nextStart)) ? Number(nextStart) : 0;
    end = Number.isFinite(Number(nextEnd)) ? Number(nextEnd) : 0;
    return getState();
  }

  function clearRange() {
    start = 0;
    end = 0;
    return getState();
  }

  function getState() {
    return { start, end };
  }

  return {
    version: MODULE_RANGE_STATE_MODULE_VERSION,
    getRange,
    setRange,
    clearRange,
    getState
  };
}
