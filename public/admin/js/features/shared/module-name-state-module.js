// Admin V2 shared module name state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module name state.

import { trimText } from '../../core/text.js';

export const MODULE_NAME_STATE_MODULE_VERSION = 'module-name-state-0';

export function createModuleNameStateModule(options = {}) {
  let name = trimText(options.initialName || '');

  function getName() {
    return name;
  }

  function setName(value) {
    name = trimText(value || '');
    return getState();
  }

  function clearName() {
    name = '';
    return getState();
  }

  function hasName() {
    return Boolean(name);
  }

  function getState() {
    return { name, hasName: hasName() };
  }

  return {
    version: MODULE_NAME_STATE_MODULE_VERSION,
    getName,
    setName,
    clearName,
    hasName,
    getState
  };
}
