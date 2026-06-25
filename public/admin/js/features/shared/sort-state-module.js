// Admin V2 shared sort state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared list sort state.

export const SORT_STATE_MODULE_VERSION = 'sort-state-0';

export function createSortStateModule(options = {}) {
  let sortKey = typeof options.initialSortKey === 'string' ? options.initialSortKey : '';
  let sortDirection = normalizeSortDirection(options.initialSortDirection || 'asc');

  function getSortKey() {
    return sortKey;
  }

  function setSortKey(value) {
    sortKey = typeof value === 'string' ? value : '';
    return sortKey;
  }

  function getSortDirection() {
    return sortDirection;
  }

  function setSortDirection(value) {
    sortDirection = normalizeSortDirection(value);
    return sortDirection;
  }

  function getState() {
    return { sortKey, sortDirection };
  }

  return {
    version: SORT_STATE_MODULE_VERSION,
    getSortKey,
    setSortKey,
    getSortDirection,
    setSortDirection,
    getState
  };
}

export function normalizeSortDirection(value) {
  return value === 'desc' ? 'desc' : 'asc';
}
