// Admin V2 shared module lifecycle module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module init state.

export const MODULE_LIFECYCLE_MODULE_VERSION = 'module-lifecycle-0';

export function createModuleLifecycleModule(options = {}) {
  let initialized = Boolean(options.initialized);

  function isInitialized() {
    return initialized;
  }

  function markInitialized() {
    initialized = true;
    return getState();
  }

  function markInactive() {
    initialized = false;
    return getState();
  }

  function getState() {
    return { initialized };
  }

  return {
    version: MODULE_LIFECYCLE_MODULE_VERSION,
    isInitialized,
    markInitialized,
    markInactive,
    getState
  };
}
