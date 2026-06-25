// Admin V2 shared module note state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module note state.

import { trimText } from '../../core/text.js';

export const MODULE_NOTE_STATE_MODULE_VERSION = 'module-note-state-0';

export function createModuleNoteStateModule(options = {}) {
  let note = trimText(options.initialNote || '');

  function getNote() {
    return note;
  }

  function setNote(value) {
    note = trimText(value || '');
    return getState();
  }

  function clearNote() {
    note = '';
    return getState();
  }

  function hasNote() {
    return Boolean(note);
  }

  function getState() {
    return { note, hasNote: hasNote() };
  }

  return {
    version: MODULE_NOTE_STATE_MODULE_VERSION,
    getNote,
    setNote,
    clearNote,
    hasNote,
    getState
  };
}
