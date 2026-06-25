// Admin V2 shared module visibility state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module visibility state.

export const MODULE_VISIBILITY_STATE_MODULE_VERSION = 'module-visibility-state-0';

export function createModuleVisibilityStateModule(options = {}) {
  let visible = options.initialVisible !== false;

  function isVisible() {
    return visible;
  }

  function setVisible(value) {
    visible = Boolean(value);
    return getState();
  }

  function show() {
    visible = true;
    return getState();
  }

  function hide() {
    visible = false;
    return getState();
  }

  function getState() {
    return { visible };
  }

  return {
    version: MODULE_VISIBILITY_STATE_MODULE_VERSION,
    isVisible,
    setVisible,
    show,
    hide,
    getState
  };
}
