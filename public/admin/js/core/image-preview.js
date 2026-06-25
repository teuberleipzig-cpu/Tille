// Admin V2 local image preview registry.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: keep local blob previews separate from stored GitHub/media paths.

const previews = new Map();

export function createLocalPreview(file) {
  if (!file) return '';
  return URL.createObjectURL(file);
}

export function rememberPreview(storedPath, previewUrl) {
  const key = String(storedPath || '').trim();
  const preview = String(previewUrl || '').trim();
  if (!key || !preview) return;
  previews.set(key, preview);
}

export function getPreview(storedPath) {
  return previews.get(String(storedPath || '').trim()) || '';
}

export function hasPreview(storedPath) {
  return previews.has(String(storedPath || '').trim());
}

export function forgetPreview(storedPath) {
  const key = String(storedPath || '').trim();
  const preview = previews.get(key);
  if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  previews.delete(key);
}

export function clearPreviews() {
  for (const preview of previews.values()) {
    if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview);
  }
  previews.clear();
}

export function previewOrPath(storedPath, fallbackPath = '') {
  const preview = getPreview(storedPath);
  return preview || fallbackPath || String(storedPath || '');
}

export function previewCount() {
  return previews.size;
}
