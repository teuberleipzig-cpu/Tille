// Admin V2 Events image module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for event image paths, previews and image field updates.

import { toAdminPreviewPath, toMainpageStoredPath, toRepoMediaPath, isManagedMediaPath } from '../../core/media-paths.js';
import { getPreview, previewOrPath, rememberPreview, forgetPreview } from '../../core/image-preview.js';
import { trimText } from '../../core/text.js';

export const EVENTS_IMAGE_MODULE_VERSION = 'events-image-0';

export function normalizeEventImageValue(value) {
  return trimText(value || '');
}

export function eventImagePreviewPath(value) {
  const storedPath = normalizeEventImageValue(value);
  if (!storedPath) return '';
  return previewOrPath(storedPath, toAdminPreviewPath(storedPath));
}

export function eventImageStoredPath(value) {
  return toMainpageStoredPath(normalizeEventImageValue(value));
}

export function eventImageRepoPath(value) {
  return toRepoMediaPath(normalizeEventImageValue(value));
}

export function eventImageIsManaged(value) {
  return isManagedMediaPath(normalizeEventImageValue(value));
}

export function rememberEventImagePreview(storedPath, previewUrl) {
  return rememberPreview(eventImageStoredPath(storedPath), previewUrl);
}

export function getEventImagePreview(storedPath) {
  return getPreview(eventImageStoredPath(storedPath));
}

export function forgetEventImagePreview(storedPath) {
  return forgetPreview(eventImageStoredPath(storedPath));
}

export function patchEventImage(event, imageValue) {
  return {
    ...(event || {}),
    image: eventImageStoredPath(imageValue)
  };
}

export function createEventsImageModule() {
  return {
    version: EVENTS_IMAGE_MODULE_VERSION,
    normalizeEventImageValue,
    eventImagePreviewPath,
    eventImageStoredPath,
    eventImageRepoPath,
    eventImageIsManaged,
    rememberEventImagePreview,
    getEventImagePreview,
    forgetEventImagePreview,
    patchEventImage
  };
}
