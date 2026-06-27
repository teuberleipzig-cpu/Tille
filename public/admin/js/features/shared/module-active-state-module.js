// Admin V2 shared module active state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple active/inactive module state.

export const MODULE_ACTIVE_STATE_MODULE_VERSION = 'module-active-state-0';

export function createModuleActiveStateModule(options = {}) {
  let active = Boolean(options.initialActive);

  function isActive() {
    return active;
  }

  function setActive(value) {
    active = Boolean(value);
    return getState();
  }

  function activate() {
    active = true;
    return getState();
  }

  function deactivate() {
    active = false;
    return getState();
  }

  function getState() {
    return { active };
  }

  return {
    version: MODULE_ACTIVE_STATE_MODULE_VERSION,
    isActive,
    setActive,
    activate,
    deactivate,
    getState
  };
}
