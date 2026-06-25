// Admin V2 Residents media module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for resident media list normalization and movement.

import { trimText } from '../../core/text.js';

export const RESIDENTS_MEDIA_MODULE_VERSION = 'residents-media-0';

export function normalizeResidentMediaItem(value) {
  if (typeof value === 'string') return { url: trimText(value) };
  if (!value || typeof value !== 'object') return { url: '' };
  return {
    ...value,
    url: trimText(value.url || value.path || value.src || '')
  };
}

export function normalizeResidentMediaList(value) {
  return Array.isArray(value)
    ? value.map(normalizeResidentMediaItem).filter(item => item.url)
    : [];
}

export function addResidentMediaItem(list, item) {
  const next = normalizeResidentMediaItem(item);
  if (!next.url) return normalizeResidentMediaList(list);
  return [...normalizeResidentMediaList(list), next];
}

export function removeResidentMediaItem(list, index) {
  const items = normalizeResidentMediaList(list);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) return items;
  return items.filter((_, itemIndex) => itemIndex !== i);
}

export function moveResidentMediaItem(list, fromIndex, toIndex) {
  const items = normalizeResidentMediaList(list);
  const from = Number(fromIndex);
  const to = Number(toIndex);
  if (!Number.isInteger(from) || !Number.isInteger(to)) return items;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const moved = items.splice(from, 1)[0];
  items.splice(to, 0, moved);
  return items;
}

export function createResidentsMediaModule() {
  return {
    version: RESIDENTS_MEDIA_MODULE_VERSION,
    normalizeResidentMediaItem,
    normalizeResidentMediaList,
    addResidentMediaItem,
    removeResidentMediaItem,
    moveResidentMediaItem
  };
}
