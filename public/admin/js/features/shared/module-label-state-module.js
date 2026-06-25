// Admin V2 shared module label state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module label state.

import { trimText } from '../../core/text.js';

export const MODULE_LABEL_STATE_MODULE_VERSION = 'module-label-state-0';

export function createModuleLabelStateModule(options = {}) {
  let label = trimText(options.initialLabel || '');

  function getLabel() {
    return label;
  }

  function setLabel(value) {
    label = trimText(value || '');
    return getState();
  }

  function clearLabel() {
    label = '';
    return getState();
  }

  function hasLabel() {
    return Boolean(label);
  }

  function getState() {
    return { label, hasLabel: hasLabel() };
  }

  return {
    version: MODULE_LABEL_STATE_MODULE_VERSION,
    getLabel,
    setLabel,
    clearLabel,
    hasLabel,
    getState
  };
}
