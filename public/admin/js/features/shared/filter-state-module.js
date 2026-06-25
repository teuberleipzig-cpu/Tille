// Admin V2 shared filter state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared filter state.

import { trimText } from '../../core/text.js';

export const FILTER_STATE_MODULE_VERSION = 'filter-state-0';

export function createFilterStateModule(options = {}) {
  let filterText = trimText(options.initialFilterText || '');

  function getFilterText() {
    return filterText;
  }

  function setFilterText(value) {
    filterText = trimText(value || '');
    return filterText;
  }

  function clearFilterText() {
    filterText = '';
    return filterText;
  }

  function hasFilterText() {
    return Boolean(filterText);
  }

  function getState() {
    return { filterText };
  }

  return {
    version: FILTER_STATE_MODULE_VERSION,
    getFilterText,
    setFilterText,
    clearFilterText,
    hasFilterText,
    getState
  };
}
