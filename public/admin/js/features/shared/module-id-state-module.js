// Admin V2 shared module id state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module id state.

import { trimText } from '../../core/text.js';

export const MODULE_ID_STATE_MODULE_VERSION = 'module-id-state-0';

export function createModuleIdStateModule(options = {}) {
  let id = trimText(options.initialId || '');

  function getId() {
    return id;
  }

  function setId(value) {
    id = trimText(value || '');
    return getState();
  }

  function clearId() {
    id = '';
    return getState();
  }

  function hasId() {
    return Boolean(id);
  }

  function getState() {
    return { id, hasId: hasId() };
  }

  return {
    version: MODULE_ID_STATE_MODULE_VERSION,
    getId,
    setId,
    clearId,
    hasId,
    getState
  };
}
