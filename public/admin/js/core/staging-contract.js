// Browser projection of scripts/content/environments.mjs and content-manifest.mjs.
// No Node runtime import; parity is covered by admin staging contract tests.
export const ADMIN_REPOSITORY = Object.freeze({ owner: 'teuberleipzig-cpu', repo: 'Tille' });
export const CONTENT_REF = 'content/staging';
export const RESIDENT_PATH = 'public/residents/data/residents.json';
export const GALLERY_PATH = 'public/gallery/data/gallery.json';
export const NAVIGATION_PATH = 'public/site/data/site-navigation.json';
export function sha(value) {
  if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('Vollständiger GitHub-SHA fehlt. Bitte neu laden.');
  return value;
}
export function settings(value) {
  if (value.environment === 'live') throw new Error('Live admin publishing is not activated yet.');
  if (value.environment !== 'staging') throw new Error('Bitte Staging als Umgebung auswählen.');
  if (value.contentRef !== CONTENT_REF || (value.branch && value.branch !== CONTENT_REF)) throw new Error('Schreibziel muss content/staging sein.');
  if (value.owner !== ADMIN_REPOSITORY.owner || value.repo !== ADMIN_REPOSITORY.repo) throw new Error('Admin-Repository stimmt nicht überein.');
  return Object.freeze({ ...ADMIN_REPOSITORY, environment: 'staging', contentRef: CONTENT_REF, token: String(value.token || '').trim() });
}
export function repoPath(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value)
      || value.split('/').some(p => !p || p === '.' || p === '..' || p.endsWith('.'))) throw new Error('Unsicherer Contentpfad.');
  return value;
}
export function assertScope(scope, subject, paths) {
  for (const value of paths) {
    const file = repoPath(value);
    let allowed = false;
    if (scope === 'resident') allowed = file === RESIDENT_PATH;
    if (scope === 'navigation') allowed = file === NAVIGATION_PATH;
    if (scope === 'gallery') allowed = file === GALLERY_PATH || /^public\/gallery\/media\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|png|gif|webp|avif)$/.test(file);
    if (scope === 'resident-media' && /^[a-z0-9-]+$/.test(subject || '')) {
      allowed = file.startsWith(`public/residents/media/${subject}/`)
        && /^public\/residents\/media\/[a-z0-9-]+\/(?:(photos|releases)\/[A-Za-z0-9_-]+\.jpg|presskit\/[A-Za-z0-9_-]+\.(pdf|zip))$/.test(file);
    }
    if (scope === 'event-media' && /^[a-z0-9-]+$/.test(subject || '')) {
      allowed = file.startsWith(`public/events/media/${subject}/`) && /^public\/events\/media\/[a-z0-9-]+\/[A-Za-z0-9_-]+\.jpg$/.test(file);
    }
    if (scope === 'event' && /^[A-Za-z0-9._-]+$/.test(subject || '')) {
      allowed = file === `events/${subject}/index.html` || file === 'sitemap.xml'
        || /^public\/events\/data\/(manifest|meta|event-index|search-index)\.json$/.test(file)
        || /^public\/events\/data\/months\/\d{4}-(0[1-9]|1[0-2])\.json$/.test(file);
    }
    if (!allowed) throw new Error('Contentpfad liegt außerhalb dieses Admin-Vorgangs: ' + file);
  }
}
