// Admin V2 shared GitHub media delete module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for deleting managed media files from GitHub.

import { toRepoMediaPath } from '../../core/media-paths.js';
import { trimText } from '../../core/text.js';

export const GITHUB_MEDIA_DELETE_MODULE_VERSION = 'github-media-delete-0';

export function isDeletableManagedMediaPath(value) {
  const repoPath = toRepoMediaPath(value);
  return repoPath.startsWith('public/events/media/') || repoPath.startsWith('public/residents/media/');
}

export function createGitHubMediaDeleteRequest(value) {
  const repoPath = toRepoMediaPath(value);
  if (!repoPath || !isDeletableManagedMediaPath(repoPath)) {
    return { repoPath: '', shouldDelete: false };
  }
  return {
    repoPath,
    shouldDelete: true,
    commitMessage: 'Delete admin media ' + repoPath
  };
}

export function createGitHubMediaDeleteModule(options = {}) {
  const buildRequest = options.buildRequest || createGitHubMediaDeleteRequest;

  function getDeleteRequest(value) {
    return buildRequest(trimText(value || ''));
  }

  return {
    version: GITHUB_MEDIA_DELETE_MODULE_VERSION,
    isDeletableManagedMediaPath,
    createGitHubMediaDeleteRequest,
    getDeleteRequest
  };
}
