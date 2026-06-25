// Admin V2 shared module disabled state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module disabled state.

export const MODULE_DISABLED_STATE_MODULE_VERSION = 'module-disabled-state-0';

export function createModuleDisabledStateModule(options = {}) {
  let disabled = Boolean(options.initialDisabled);

  function isDisabled() {
    return disabled;
  }

  function setDisabled(value) {
    disabled = Boolean(value);
    return getState();
  }

  function enable() {
    disabled = false;
    return getState();
  }

  function disable() {
    disabled = true;
    return getState();
  }

  function getState() {
    return { disabled };
  }

  return {
    version: MODULE_DISABLED_STATE_MODULE_VERSION,
    isDisabled,
    setDisabled,
    enable,
    disable,
    getState
  };
}
