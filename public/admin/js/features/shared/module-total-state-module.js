// Admin V2 shared module total state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module total state.

export const MODULE_TOTAL_STATE_MODULE_VERSION = 'module-total-state-0';

export function createModuleTotalStateModule(options = {}) {
  let total = Number.isFinite(Number(options.initialTotal)) ? Math.max(0, Number(options.initialTotal)) : 0;

  function getTotal() {
    return total;
  }

  function setTotal(value) {
    total = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
    return getState();
  }

  function resetTotal() {
    total = 0;
    return getState();
  }

  function getState() {
    return { total };
  }

  return {
    version: MODULE_TOTAL_STATE_MODULE_VERSION,
    getTotal,
    setTotal,
    resetTotal,
    getState
  };
}
