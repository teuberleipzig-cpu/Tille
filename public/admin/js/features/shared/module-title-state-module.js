// Admin V2 shared module title state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module title state.

import { trimText } from '../../core/text.js';

export const MODULE_TITLE_STATE_MODULE_VERSION = 'module-title-state-0';

export function createModuleTitleStateModule(options = {}) {
  let title = trimText(options.initialTitle || '');

  function getTitle() {
    return title;
  }

  function setTitle(value) {
    title = trimText(value || '');
    return getState();
  }

  function clearTitle() {
    title = '';
    return getState();
  }

  function hasTitle() {
    return Boolean(title);
  }

  function getState() {
    return { title, hasTitle: hasTitle() };
  }

  return {
    version: MODULE_TITLE_STATE_MODULE_VERSION,
    getTitle,
    setTitle,
    clearTitle,
    hasTitle,
    getState
  };
}
