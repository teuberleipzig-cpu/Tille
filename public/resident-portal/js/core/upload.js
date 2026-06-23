import { CONFIG } from './config.js';

export function slug(value, fallback = 'media') {
  return String(value || fallback)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function toBase64(buffer) {
  let output = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 32768) {
    output += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  }
  return btoa(output);
}

function repoPathFromPublicUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.startsWith('blob:') || raw.startsWith('data:')) return '';
  if (raw.startsWith('public/')) return raw;
  const marker = '/residents/';
  const index = raw.indexOf(marker);
  if (index >= 0) return 'public' + raw.slice(index);
  return raw.replace(/^\/+/, '');
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

export async function uploadBlob(path, blob, token) {
  if (!token) throw new Error('GitHub Token fehlt.');

  const apiPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${apiPath}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({
      message: 'Upload media ' + path,
      content: toBase64(await blob.arrayBuffer()),
      branch: CONFIG.branch
    })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Upload fehlgeschlagen.');
  return '/' + path.replace(/^public\//, '');
}

export async function deleteRepoFile(publicUrl, token) {
  if (!token) throw new Error('GitHub Token fehlt.');
  const path = repoPathFromPublicUrl(publicUrl);
  if (!path || !path.startsWith('public/residents/media/')) return { skipped: true };

  const apiPath = path.split('/').map(encodeURIComponent).join('/');
  const getResponse = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${apiPath}?ref=${CONFIG.branch}`, {
    headers: headers(token),
    cache: 'no-store'
  });

  if (getResponse.status === 404) return { skipped: true, missing: true };
  if (!getResponse.ok) {
    const error = await getResponse.json().catch(() => ({}));
    throw new Error(error.message || 'GitHub-Datei konnte nicht geprüft werden.');
  }

  const meta = await getResponse.json();
  const deleteResponse = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${apiPath}`, {
    method: 'DELETE',
    headers: headers(token),
    body: JSON.stringify({
      message: 'Delete media ' + path,
      sha: meta.sha,
      branch: CONFIG.branch
    })
  });

  if (!deleteResponse.ok) {
    const error = await deleteResponse.json().catch(() => ({}));
    throw new Error(error.message || 'GitHub-Datei konnte nicht gelöscht werden.');
  }

  return { deleted: true, path };
}
