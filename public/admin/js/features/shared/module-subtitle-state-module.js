// Admin V2 shared module subtitle state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module subtitle state.

import { trimText } from '../../core/text.js';

export const MODULE_SUBTITLE_STATE_MODULE_VERSION = 'module-subtitle-state-0';

export function createModuleSubtitleStateModule(options = {}) {
  let subtitle = trimText(options.initialSubtitle || '');

  function getSubtitle() {
    return subtitle;
  }

  function setSubtitle(value) {
    subtitle = trimText(value || '');
    return getState();
  }

  function clearSubtitle() {
    subtitle = '';
    return getState();
  }

  function hasSubtitle() {
    return Boolean(subtitle);
  }

  function getState() {
    return { subtitle, hasSubtitle: hasSubtitle() };
  }

  return {
    version: MODULE_SUBTITLE_STATE_MODULE_VERSION,
    getSubtitle,
    setSubtitle,
    clearSubtitle,
    hasSubtitle,
    getState
  };
}
