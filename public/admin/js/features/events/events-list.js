// Admin V2 Events list module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for event list rendering, filtering and selection.

import { compareDatesAsc, compareDatesDesc, dateSortKey } from '../../core/dates.js';
import { trimText, normalizeText } from '../../core/text.js';

export const EVENTS_LIST_MODULE_VERSION = 'events-list-0';

export function createEventsListModule(options = {}) {
  const state = {
    events: Array.isArray(options.events) ? options.events : [],
    selectedIndex: Number.isInteger(options.selectedIndex) ? options.selectedIndex : -1,
    filterText: trimText(options.filterText || ''),
    sortDirection: options.sortDirection === 'asc' ? 'asc' : 'desc'
  };

  function setEvents(events) {
    state.events = Array.isArray(events) ? events : [];
    return getVisibleEvents();
  }

  function setSelectedIndex(index) {
    state.selectedIndex = Number.isInteger(index) ? index : -1;
    return state.selectedIndex;
  }

  function setFilterText(value) {
    state.filterText = trimText(value || '');
    return getVisibleEvents();
  }

  function setSortDirection(direction) {
    state.sortDirection = direction === 'asc' ? 'asc' : 'desc';
    return getVisibleEvents();
  }

  function getVisibleEvents() {
    return filterEvents(state.events, state.filterText).sort((a, b) => {
      return state.sortDirection === 'asc'
        ? compareDatesAsc(a?.date, b?.date)
        : compareDatesDesc(a?.date, b?.date);
    });
  }

  function getState() {
    return { ...state };
  }

  return {
    version: EVENTS_LIST_MODULE_VERSION,
    getState,
    setEvents,
    setSelectedIndex,
    setFilterText,
    setSortDirection,
    getVisibleEvents
  };
}

export function filterEvents(events, filterText = '') {
  const list = Array.isArray(events) ? events : [];
  const needle = normalizeText(filterText || '');
  if (!needle) return [...list];

  return list.filter(event => {
    const haystack = normalizeText([
      event?.date,
      event?.title,
      event?.venue,
      event?.city,
      event?.subtitle,
      event?.status
    ].filter(Boolean).join(' '));
    return haystack.includes(needle);
  });
}

export function eventListSortKey(event) {
  return dateSortKey(event?.date || '');
}
