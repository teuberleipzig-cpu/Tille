// Admin V2 shared module error state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module error state.

import { trimText } from '../../core/text.js';

export const MODULE_ERROR_STATE_MODULE_VERSION = 'module-error-state-0';

export function createModuleErrorStateModule(options = {}) {
  let errorMessage = trimText(options.initialErrorMessage || '');

  function hasError() {
    return Boolean(errorMessage);
  }

  function getErrorMessage() {
    return errorMessage;
  }

  function setErrorMessage(value) {
    errorMessage = trimText(value || '');
    return getState();
  }

  function clearErrorMessage() {
    errorMessage = '';
    return getState();
  }

  function getState() {
    return { errorMessage, hasError: hasError() };
  }

  return {
    version: MODULE_ERROR_STATE_MODULE_VERSION,
    hasError,
    getErrorMessage,
    setErrorMessage,
    clearErrorMessage,
    getState
  };
}
