export function slug(value, fallback = 'media') {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
}
export function mediaPath(value, id) {
  const path = String(value || '').replace(/^\/residents\//, 'public/residents/');
  const prefix = `public/residents/media/${slug(id, '')}/`;
  if (!id || !slug(id, '') || !path.startsWith(prefix) || path.includes('..') || /[\\%?#]/.test(path)) {
    throw new Error('Medienpfad liegt nicht im erlaubten Resident-Scope.');
  }
  if (!/^(?:photos\/[a-z0-9-]+\.jpg|releases\/[a-z0-9-]+\.jpg|presskit\/[a-z0-9-]+\.(?:pdf|zip))$/.test(path.slice(prefix.length))) {
    throw new Error('Unzulässiger Medienpfad oder Dateityp.');
  }
  return path;
}
