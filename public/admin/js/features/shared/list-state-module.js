// Admin V2 shared list state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared list, filter and selection state.

import { trimText } from '../../core/text.js';

export const LIST_STATE_MODULE_VERSION = 'list-state-0';

export function createListStateModule(options = {}) {
  const normalizeItem = typeof options.normalizeItem === 'function'
    ? options.normalizeItem
    : item => item;

  const state = {
    items: normalizeItems(options.items, normalizeItem),
    filterText: trimText(options.filterText || ''),
    selectedIndex: Number.isInteger(options.selectedIndex) ? options.selectedIndex : -1
  };

  function getState() {
    return {
      items: [...state.items],
      filterText: state.filterText,
      selectedIndex: state.selectedIndex
    };
  }

  function setItems(items) {
    state.items = normalizeItems(items, normalizeItem);
    if (state.selectedIndex >= state.items.length) state.selectedIndex = -1;
    return [...state.items];
  }

  function setFilterText(value) {
    state.filterText = trimText(value || '');
    return state.filterText;
  }

  function setSelectedIndex(index) {
    state.selectedIndex = Number.isInteger(index) ? index : -1;
    return state.selectedIndex;
  }

  function getSelectedItem() {
    return state.selectedIndex >= 0 ? state.items[state.selectedIndex] || null : null;
  }

  return {
    version: LIST_STATE_MODULE_VERSION,
    getState,
    setItems,
    setFilterText,
    setSelectedIndex,
    getSelectedItem
  };
}

export function normalizeItems(items, normalizeItem = item => item) {
  return Array.isArray(items) ? items.map(normalizeItem).filter(Boolean) : [];
}
