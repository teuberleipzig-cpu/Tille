// Admin V2 shared module warning state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module warning state.

import { trimText } from '../../core/text.js';

export const MODULE_WARNING_STATE_MODULE_VERSION = 'module-warning-state-0';

export function createModuleWarningStateModule(options = {}) {
  let warningMessage = trimText(options.initialWarningMessage || '');

  function hasWarning() {
    return Boolean(warningMessage);
  }

  function getWarningMessage() {
    return warningMessage;
  }

  function setWarningMessage(value) {
    warningMessage = trimText(value || '');
    return getState();
  }

  function clearWarningMessage() {
    warningMessage = '';
    return getState();
  }

  function getState() {
    return { warningMessage, hasWarning: hasWarning() };
  }

  return {
    version: MODULE_WARNING_STATE_MODULE_VERSION,
    hasWarning,
    getWarningMessage,
    setWarningMessage,
    clearWarningMessage,
    getState
  };
}
