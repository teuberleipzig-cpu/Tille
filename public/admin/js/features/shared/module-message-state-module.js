// Admin V2 shared module message state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for general module message state.

import { trimText } from '../../core/text.js';

export const MODULE_MESSAGE_STATE_MODULE_VERSION = 'module-message-state-0';

export function createModuleMessageStateModule(options = {}) {
  let messageText = trimText(options.initialMessageText || '');

  function hasMessage() {
    return Boolean(messageText);
  }

  function getMessageText() {
    return messageText;
  }

  function setMessageText(value) {
    messageText = trimText(value || '');
    return getState();
  }

  function clearMessageText() {
    messageText = '';
    return getState();
  }

  function getState() {
    return { messageText, hasMessage: hasMessage() };
  }

  return {
    version: MODULE_MESSAGE_STATE_MODULE_VERSION,
    hasMessage,
    getMessageText,
    setMessageText,
    clearMessageText,
    getState
  };
}
