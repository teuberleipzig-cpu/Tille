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

export async function uploadBlob(path, blob, token) {
  if (!token) throw new Error('GitHub Token fehlt.');

  const apiPath = path.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${apiPath}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
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
