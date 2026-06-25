// Admin V2 Releases list module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for release list normalization, filtering and sorting.

import { compareDatesDesc, normalizeDateInput } from '../../core/dates.js';
import { normalizeText, trimText } from '../../core/text.js';

export const RELEASES_LIST_MODULE_VERSION = 'releases-list-0';

export function normalizeReleaseItem(value) {
  if (!value || typeof value !== 'object') {
    return createEmptyReleaseItem();
  }

  return {
    ...value,
    title: trimText(value.title || value.name || ''),
    artist: trimText(value.artist || value.resident || ''),
    date: normalizeDateInput(value.date || value.releaseDate || ''),
    label: trimText(value.label || ''),
    link: trimText(value.link || value.url || '')
  };
}

export function createEmptyReleaseItem() {
  return {
    title: '',
    artist: '',
    date: '',
    label: '',
    link: ''
  };
}

export function normalizeReleaseList(value) {
  return Array.isArray(value)
    ? value.map(normalizeReleaseItem).filter(item => item.title || item.artist || item.date || item.link)
    : [];
}

export function filterReleases(releases, filterText = '') {
  const list = normalizeReleaseList(releases);
  const needle = normalizeText(filterText || '');
  if (!needle) return list;

  return list.filter(release => {
    const haystack = normalizeText([
      release.title,
      release.artist,
      release.date,
      release.label,
      release.link
    ].filter(Boolean).join(' '));
    return haystack.includes(needle);
  });
}

export function sortReleasesDesc(releases) {
  return normalizeReleaseList(releases).sort((a, b) => compareDatesDesc(a.date, b.date));
}

export function createReleasesListModule(options = {}) {
  const state = {
    releases: normalizeReleaseList(options.releases),
    filterText: trimText(options.filterText || ''),
    selectedIndex: Number.isInteger(options.selectedIndex) ? options.selectedIndex : -1
  };

  function setReleases(releases) {
    state.releases = normalizeReleaseList(releases);
    return getVisibleReleases();
  }

  function setFilterText(value) {
    state.filterText = trimText(value || '');
    return getVisibleReleases();
  }

  function setSelectedIndex(index) {
    state.selectedIndex = Number.isInteger(index) ? index : -1;
    return state.selectedIndex;
  }

  function getVisibleReleases() {
    return sortReleasesDesc(filterReleases(state.releases, state.filterText));
  }

  function getState() {
    return { ...state };
  }

  return {
    version: RELEASES_LIST_MODULE_VERSION,
    getState,
    setReleases,
    setFilterText,
    setSelectedIndex,
    getVisibleReleases
  };
}
