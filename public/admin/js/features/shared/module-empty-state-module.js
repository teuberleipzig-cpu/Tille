// Admin V2 shared module empty state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module empty state.

import { trimText } from '../../core/text.js';

export const MODULE_EMPTY_STATE_MODULE_VERSION = 'module-empty-state-0';

export function createModuleEmptyStateModule(options = {}) {
  let empty = Boolean(options.initialEmpty);
  let emptyText = trimText(options.initialEmptyText || '');

  function isEmpty() {
    return empty;
  }

  function setEmpty(value) {
    empty = Boolean(value);
    return getState();
  }

  function getEmptyText() {
    return emptyText;
  }

  function setEmptyText(value) {
    emptyText = trimText(value || '');
    return getState();
  }

  function getState() {
    return { empty, emptyText };
  }

  return {
    version: MODULE_EMPTY_STATE_MODULE_VERSION,
    isEmpty,
    setEmpty,
    getEmptyText,
    setEmptyText,
    getState
  };
}
