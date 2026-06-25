// Admin V2 shared module limit state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module limit state.

export const MODULE_LIMIT_STATE_MODULE_VERSION = 'module-limit-state-0';

export function createModuleLimitStateModule(options = {}) {
  let limit = Number.isInteger(Number(options.initialLimit)) ? Math.max(1, Number(options.initialLimit)) : 100;

  function getLimit() {
    return limit;
  }

  function setLimit(value) {
    limit = Number.isInteger(Number(value)) ? Math.max(1, Number(value)) : 100;
    return getState();
  }

  function resetLimit() {
    limit = 100;
    return getState();
  }

  function getState() {
    return { limit };
  }

  return {
    version: MODULE_LIMIT_STATE_MODULE_VERSION,
    getLimit,
    setLimit,
    resetLimit,
    getState
  };
}
