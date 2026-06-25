// Admin V2 Residents list module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for resident list rendering, filtering and selection.

import { normalizeText, trimText } from '../../core/text.js';

export const RESIDENTS_LIST_MODULE_VERSION = 'residents-list-0';

export function createResidentsListModule(options = {}) {
  const state = {
    residents: Array.isArray(options.residents) ? options.residents : [],
    selectedIndex: Number.isInteger(options.selectedIndex) ? options.selectedIndex : -1,
    filterText: trimText(options.filterText || ''),
    sortDirection: options.sortDirection === 'desc' ? 'desc' : 'asc'
  };

  function setResidents(residents) {
    state.residents = Array.isArray(residents) ? residents : [];
    return getVisibleResidents();
  }

  function setSelectedIndex(index) {
    state.selectedIndex = Number.isInteger(index) ? index : -1;
    return state.selectedIndex;
  }

  function setFilterText(value) {
    state.filterText = trimText(value || '');
    return getVisibleResidents();
  }

  function setSortDirection(direction) {
    state.sortDirection = direction === 'desc' ? 'desc' : 'asc';
    return getVisibleResidents();
  }

  function getVisibleResidents() {
    return sortResidents(filterResidents(state.residents, state.filterText), state.sortDirection);
  }

  function getState() {
    return { ...state };
  }

  return {
    version: RESIDENTS_LIST_MODULE_VERSION,
    getState,
    setResidents,
    setSelectedIndex,
    setFilterText,
    setSortDirection,
    getVisibleResidents
  };
}

export function filterResidents(residents, filterText = '') {
  const list = Array.isArray(residents) ? residents : [];
  const needle = normalizeText(filterText || '');
  if (!needle) return [...list];

  return list.filter(resident => {
    const haystack = normalizeText([
      resident?.name,
      resident?.slug,
      resident?.role,
      resident?.city,
      resident?.country,
      resident?.bio,
      ...(Array.isArray(resident?.genres) ? resident.genres : [])
    ].filter(Boolean).join(' '));
    return haystack.includes(needle);
  });
}

export function sortResidents(residents, direction = 'asc') {
  const factor = direction === 'desc' ? -1 : 1;
  return [...(Array.isArray(residents) ? residents : [])].sort((a, b) => {
    const left = normalizeText(a?.name || a?.slug || '');
    const right = normalizeText(b?.name || b?.slug || '');
    return left.localeCompare(right) * factor;
  });
}

export function residentListSortKey(resident) {
  return normalizeText(resident?.name || resident?.slug || '');
}
