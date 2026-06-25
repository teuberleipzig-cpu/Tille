// Admin V2 shared save status module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared save and status messages.

import { createStatus, statusText } from '../../core/status.js';
import { trimText } from '../../core/text.js';

export const SAVE_STATUS_MODULE_VERSION = 'save-status-0';

export function createSaveStatusModule(options = {}) {
  let current = createStatus('idle', trimText(options.initialText || ''));

  function getStatus() {
    return { ...current };
  }

  function setStatus(type, message = '') {
    current = createStatus(type, trimText(message || ''));
    return getStatus();
  }

  function setIdle(message = '') {
    return setStatus('idle', message);
  }

  function setLoading(message = 'Speichern...') {
    return setStatus('loading', message);
  }

  function setSuccess(message = 'Gespeichert.') {
    return setStatus('success', message);
  }

  function setError(message = 'Fehler beim Speichern.') {
    return setStatus('error', message);
  }

  function getStatusText() {
    return statusText(current);
  }

  return {
    version: SAVE_STATUS_MODULE_VERSION,
    getStatus,
    setStatus,
    setIdle,
    setLoading,
    setSuccess,
    setError,
    getStatusText
  };
}
