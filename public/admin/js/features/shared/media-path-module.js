// Admin V2 shared media path module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared media path handling used by Events, Residents and Releases.

import {
  isExternalMediaUrl,
  isManagedMediaPath,
  mediaKindFromPath,
  toAdminPreviewPath,
  toMainpageStoredPath,
  toRepoMediaPath
} from '../../core/media-paths.js';
import { trimText } from '../../core/text.js';

export const MEDIA_PATH_MODULE_VERSION = 'media-path-0';

export function normalizeMediaPath(value) {
  return trimText(value || '');
}

export function mediaPathInfo(value) {
  const path = normalizeMediaPath(value);
  return {
    path,
    isExternal: isExternalMediaUrl(path),
    isManaged: isManagedMediaPath(path),
    kind: mediaKindFromPath(path),
    repoPath: toRepoMediaPath(path),
    previewPath: toAdminPreviewPath(path),
    storedPath: toMainpageStoredPath(path)
  };
}

export function createMediaPathModule() {
  return {
    version: MEDIA_PATH_MODULE_VERSION,
    normalizeMediaPath,
    mediaPathInfo
  };
}
