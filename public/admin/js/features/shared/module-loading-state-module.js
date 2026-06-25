// Admin V2 shared module loading state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module loading state.

export const MODULE_LOADING_STATE_MODULE_VERSION = 'module-loading-state-0';

export function createModuleLoadingStateModule(options = {}) {
  let loading = Boolean(options.initialLoading);

  function isLoading() {
    return loading;
  }

  function setLoading(value) {
    loading = Boolean(value);
    return getState();
  }

  function startLoading() {
    loading = true;
    return getState();
  }

  function stopLoading() {
    loading = false;
    return getState();
  }

  function getState() {
    return { loading };
  }

  return {
    version: MODULE_LOADING_STATE_MODULE_VERSION,
    isLoading,
    setLoading,
    startLoading,
    stopLoading,
    getState
  };
}
