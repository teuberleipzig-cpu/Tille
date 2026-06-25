// Admin V2 shared media preview module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared media preview state used by Events, Residents and Releases.

import { createLocalPreview, getPreview, rememberPreview, forgetPreview, clearPreviews, previewOrPath } from '../../core/image-preview.js';
import { toAdminPreviewPath } from '../../core/media-paths.js';
import { trimText } from '../../core/text.js';

export const MEDIA_PREVIEW_MODULE_VERSION = 'media-preview-0';

export function normalizeMediaPreviewKey(value) {
  return trimText(value || '');
}

export function createPreviewForFile(file) {
  return createLocalPreview(file);
}

export function rememberMediaPreview(storedPath, previewUrl) {
  const key = normalizeMediaPreviewKey(storedPath);
  if (!key) return '';
  return rememberPreview(key, previewUrl);
}

export function getMediaPreview(storedPath) {
  const key = normalizeMediaPreviewKey(storedPath);
  if (!key) return '';
  return getPreview(key);
}

export function forgetMediaPreview(storedPath) {
  const key = normalizeMediaPreviewKey(storedPath);
  if (!key) return;
  forgetPreview(key);
}

export function resolveMediaPreviewPath(storedPath) {
  const key = normalizeMediaPreviewKey(storedPath);
  if (!key) return '';
  return previewOrPath(key, toAdminPreviewPath(key));
}

export function clearMediaPreviews() {
  clearPreviews();
}

export function createMediaPreviewModule() {
  return {
    version: MEDIA_PREVIEW_MODULE_VERSION,
    normalizeMediaPreviewKey,
    createPreviewForFile,
    rememberMediaPreview,
    getMediaPreview,
    forgetMediaPreview,
    resolveMediaPreviewPath,
    clearMediaPreviews
  };
}
