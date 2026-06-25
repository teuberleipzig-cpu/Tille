// Admin V2 Residents news module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for resident news normalization, sorting and editing.

import { compareDatesDesc, normalizeDateInput, todayIso } from '../../core/dates.js';
import { trimText } from '../../core/text.js';

export const RESIDENTS_NEWS_MODULE_VERSION = 'residents-news-0';

export function createEmptyResidentNewsItem() {
  return {
    date: todayIso(),
    text: ''
  };
}

export function normalizeResidentNewsItem(value) {
  if (typeof value === 'string') {
    return {
      date: '',
      text: trimText(value)
    };
  }

  if (!value || typeof value !== 'object') return { date: '', text: '' };

  return {
    ...value,
    date: normalizeDateInput(value.date || ''),
    text: trimText(value.text || value.title || value.body || '')
  };
}

export function normalizeResidentNewsList(value) {
  return Array.isArray(value)
    ? value.map(normalizeResidentNewsItem).filter(item => item.date || item.text)
    : [];
}

export function sortResidentNewsDesc(value) {
  return normalizeResidentNewsList(value).sort((a, b) => compareDatesDesc(a.date, b.date));
}

export function addResidentNewsItem(list, item = createEmptyResidentNewsItem()) {
  return sortResidentNewsDesc([normalizeResidentNewsItem(item), ...normalizeResidentNewsList(list)]);
}

export function updateResidentNewsItem(list, index, patch = {}) {
  const items = normalizeResidentNewsList(list);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) return items;
  items[i] = normalizeResidentNewsItem({ ...items[i], ...(patch || {}) });
  return sortResidentNewsDesc(items);
}

export function removeResidentNewsItem(list, index) {
  const items = normalizeResidentNewsList(list);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= items.length) return items;
  return items.filter((_, itemIndex) => itemIndex !== i);
}

export function createResidentsNewsModule() {
  return {
    version: RESIDENTS_NEWS_MODULE_VERSION,
    createEmptyResidentNewsItem,
    normalizeResidentNewsItem,
    normalizeResidentNewsList,
    sortResidentNewsDesc,
    addResidentNewsItem,
    updateResidentNewsItem,
    removeResidentNewsItem
  };
}
