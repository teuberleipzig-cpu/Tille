import { CONFIG, inviteParam, residentParam } from './config.js';
import { state, markClean } from './state.js';

function api(path) {
  return `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/${path}`;
}

function headers(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function encodeContent(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function decodeContent(text) {
  return decodeURIComponent(escape(atob(String(text || '').replace(/\s/g, ''))));
}

export function findResidentIndex(list) {
  if (inviteParam) {
    const byInvite = list.findIndex(item => String(item.portal?.inviteId || '') === inviteParam);
    if (byInvite >= 0) return byInvite;
  }
  if (residentParam) {
    const byId = list.findIndex(item => String(item.id || '') === residentParam);
    if (byId >= 0) return byId;
  }
  return -1;
}

export async function loadPublicResidents() {
  const response = await fetch('../residents/data/residents.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Residents-Daten konnten nicht geladen werden.');
  return response.json();
}

export async function loadResidentsFromGithub(token) {
  const metaResponse = await fetch(api(`contents/${CONFIG.residentsPath}?ref=${CONFIG.branch}`), {
    headers: headers(token),
    cache: 'no-store'
  });
  if (!metaResponse.ok) throw new Error('GitHub konnte residents.json nicht laden. Prüfe Token und Repo-Rechte.');

  const meta = await metaResponse.json();
  let text = meta.content ? decodeContent(meta.content) : '';

  if (!text && meta.sha) {
    const blobResponse = await fetch(api(`git/blobs/${meta.sha}`), {
      headers: headers(token),
      cache: 'no-store'
    });
    if (!blobResponse.ok) throw new Error('GitHub Blob konnte nicht geladen werden.');
    const blob = await blobResponse.json();
    text = decodeContent(blob.content || '');
  }

  return { data: JSON.parse(text), sha: meta.sha };
}

export function selectResident(data) {
  const list = Array.isArray(data.residents) ? data.residents : [];
  const index = findResidentIndex(list);
  if (index < 0) throw new Error('Resident-Link ungültig oder noch nicht veröffentlicht.');
  const resident = list[index];
  if (!resident.portal?.enabled) throw new Error('Resident-Zugang ist deaktiviert.');
  state.data = data;
  state.resident = resident;
  state.residentIndex = index;
  return resident;
}

export function patchCurrentResident(latestData, nextResident) {
  const list = Array.isArray(latestData.residents) ? latestData.residents : [];
  if (!list.length) throw new Error('Sicherheitsabbruch: residents[] ist leer.');

  const index = findResidentIndex(list);
  if (index < 0) throw new Error('Resident in GitHub nicht gefunden.');
  if (inviteParam && String(list[index].portal?.inviteId || '') !== inviteParam) throw new Error('Invite-ID passt nicht mehr.');

  const current = list[index];
  list[index] = {
    ...current,
    ...nextResident,
    id: current.id,
    portal: current.portal
  };
  return latestData;
}

export async function saveResident(token, nextResident) {
  const latest = await loadResidentsFromGithub(token);
  const patched = patchCurrentResident(latest.data, nextResident);
  const body = {
    message: `Update resident profile from portal: ${nextResident.id || residentParam || 'resident'}`,
    content: encodeContent(JSON.stringify(patched, null, 2)),
    sha: latest.sha,
    branch: CONFIG.branch
  };

  const response = await fetch(api(`contents/${CONFIG.residentsPath}`), {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'GitHub Speichern fehlgeschlagen.');
  }

  state.resident = nextResident;
  markClean();
}
