// Admin V2 Residents media module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for resident media list normalization, movement and preview path resolution.

import { trimText } from '../../core/text.js';

export const RESIDENTS_MEDIA_MODULE_VERSION = 'residents-media-1';

export function normalizeResidentMediaItem(value) {
  if (typeof value === 'string') return { url: trimText(value) };
  if (!value || typeof value !== 'object') return { url: '' };
  return {
    ...value,
    url: trimText(value.url || value.path || value.src || value.imageUrl || '')
  };
}

export function normalizeResidentMediaList(value) {
  return Array.isArray(value)
    ? value.map(normalizeResidentMediaItem).filter(item => item.url)
    : [];
}

export function normalizeResidentPhotoListFromResident(resident) {
  if (!resident) return [];
  const source = Array.isArray(resident.photoList)
    ? resident.photoList
    : Array.isArray(resident.photos)
      ? resident.photos
      : [];
  return normalizeResidentMediaList(source);
}

export function normalizeResidentEmbeds(value) {
  if (Array.isArray(value)) return value.map(item => trimText(item || '')).filter(Boolean);
  if (typeof value === 'string') return value.split(/\n+/).map(item => trimText(item)).filter(Boolean);
  return [];
}

export function normalizeResidentEmbedsFromResident(resident) {
  if (!resident) return [];
  if (Array.isArray(resident.embeds) || typeof resident.embeds === 'string') return normalizeResidentEmbeds(resident.embeds);
  if (Array.isArray(resident.mediaEmbeds) || typeof resident.mediaEmbeds === 'string') return normalizeResidentEmbeds(resident.mediaEmbeds);
  return [];
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

export function repoPathFromResidentMediaUrl(value) {
  const raw = trimText(value || '');
  if (!raw || raw.startsWith('blob:') || raw.startsWith('data:')) return '';
  if (raw.startsWith('public/')) return raw;
  const marker = '/residents/';
  const index = raw.indexOf(marker);
  if (index >= 0) return 'public' + raw.slice(index);
  return raw.replace(/^\/+/, '');
}

export function resolveResidentMediaAssetUrl(value, options = {}) {
  const url = trimText(value || '');
  if (!url) return url;

  const previews = options.previewMap;
  if (previews && previews.has && previews.has(url)) return previews.get(url);
  if (/^(https?:|data:|blob:)/.test(url)) return url;

  const pathname = trimText(options.pathname || '');
  if (url.startsWith('/residents/') && pathname.includes('/public/')) {
    const prefix = pathname.slice(0, pathname.indexOf('/public/')) + '/public';
    const resolved = prefix + url;
    if (previews && previews.has && previews.has(resolved)) return previews.get(resolved);
    return resolved;
  }

  return url;
}

export function createResidentMediaViewModel(resident, options = {}) {
  return {
    photos: normalizeResidentPhotoListFromResident(resident).map((item, index) => ({
      ...item,
      index,
      previewUrl: resolveResidentMediaAssetUrl(item.url, options)
    })),
    embeds: normalizeResidentEmbedsFromResident(resident)
  };
}

export function createResidentsMediaModule() {
  return {
    version: RESIDENTS_MEDIA_MODULE_VERSION,
    normalizeResidentMediaItem,
    normalizeResidentMediaList,
    normalizeResidentPhotoListFromResident,
    normalizeResidentEmbeds,
    normalizeResidentEmbedsFromResident,
    addResidentMediaItem,
    removeResidentMediaItem,
    moveResidentMediaItem,
    repoPathFromResidentMediaUrl,
    resolveResidentMediaAssetUrl,
    createResidentMediaViewModel
  };
}
