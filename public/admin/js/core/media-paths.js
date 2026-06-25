// Admin V2 media path helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize path conversion before existing upload/preview code is migrated.

export function isExternalMediaUrl(value) {
  const url = String(value || '').trim();
  return /^(https?:|data:|blob:)/.test(url);
}

export function stripLeadingSlash(value) {
  return String(value || '').replace(/^\/+/, '');
}

export function toRepoMediaPath(value) {
  const raw = String(value || '').trim();
  if (!raw || isExternalMediaUrl(raw)) return raw;

  if (raw.startsWith('public/events/media/') || raw.startsWith('public/residents/media/')) return raw;

  if (raw.startsWith('/events/media/')) return 'public' + raw;
  if (raw.startsWith('/residents/media/')) return 'public' + raw;

  if (raw.startsWith('events/media/')) return 'public/' + raw;
  if (raw.startsWith('residents/media/')) return 'public/' + raw;

  if (raw.startsWith('/Tille/public/')) return 'public/' + raw.split('/Tille/public/')[1];
  if (raw.startsWith('../events/media/')) return 'public/' + raw.replace(/^\.\.\//, '');
  if (raw.startsWith('../residents/media/')) return 'public/' + raw.replace(/^\.\.\//, '');

  return raw;
}

export function toAdminPreviewPath(value) {
  const raw = String(value || '').trim();
  if (!raw || isExternalMediaUrl(raw)) return raw;

  if (raw.startsWith('/Tille/public/')) return raw;
  if (raw.startsWith('public/events/media/') || raw.startsWith('public/residents/media/')) {
    return '../' + raw.replace(/^public\//, '');
  }

  if (raw.startsWith('/events/media/') || raw.startsWith('/residents/media/')) return '..' + raw;
  if (raw.startsWith('events/media/') || raw.startsWith('residents/media/')) return '../' + raw;

  return raw;
}

export function toMainpageStoredPath(value) {
  const raw = String(value || '').trim();
  if (!raw || isExternalMediaUrl(raw)) return raw;
  return toRepoMediaPath(raw);
}

export function isManagedMediaPath(value) {
  const repoPath = toRepoMediaPath(value);
  return repoPath.startsWith('public/events/media/') || repoPath.startsWith('public/residents/media/');
}

export function mediaKindFromPath(value) {
  const repoPath = toRepoMediaPath(value);
  if (repoPath.startsWith('public/events/media/')) return 'event';
  if (repoPath.startsWith('public/residents/media/')) return 'resident';
  return '';
}
