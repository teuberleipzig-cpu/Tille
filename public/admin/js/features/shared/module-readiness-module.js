// Admin V2 shared module readiness module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module readiness state.

export const MODULE_READINESS_MODULE_VERSION = 'module-readiness-0';

export function createModuleReadinessModule(options = {}) {
  let ready = Boolean(options.initialReady);

  function isReady() {
    return ready;
  }

  function markReady() {
    ready = true;
    return getState();
  }

  function markNotReady() {
    ready = false;
    return getState();
  }

  function getState() {
    return { ready };
  }

  return {
    version: MODULE_READINESS_MODULE_VERSION,
    isReady,
    markReady,
    markNotReady,
    getState
  };
}
