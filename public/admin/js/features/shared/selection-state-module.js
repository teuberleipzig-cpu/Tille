// Admin V2 shared selection state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared list selection state.

export const SELECTION_STATE_MODULE_VERSION = 'selection-state-0';

export function createSelectionStateModule(options = {}) {
  let selectedIndex = Number.isInteger(options.initialSelectedIndex) ? options.initialSelectedIndex : -1;

  function getSelectedIndex() {
    return selectedIndex;
  }

  function setSelectedIndex(index) {
    selectedIndex = Number.isInteger(index) ? index : -1;
    return selectedIndex;
  }

  function clearSelectedIndex() {
    selectedIndex = -1;
    return selectedIndex;
  }

  function hasSelection() {
    return selectedIndex >= 0;
  }

  function getState() {
    return { selectedIndex };
  }

  return {
    version: SELECTION_STATE_MODULE_VERSION,
    getSelectedIndex,
    setSelectedIndex,
    clearSelectedIndex,
    hasSelection,
    getState
  };
}
