import { $, escapeHtml, setStatus } from '../core/dom.js';
import { markDirty, requireResident, state } from '../core/state.js';
import { imageToJpeg } from '../core/image-processing.js';
import { slug, uploadBlob } from '../core/upload.js';

function assetUrl(value) {
  const url = String(value || '');
  if (!url || /^(https?:|data:|blob:)/.test(url)) return url;
  if (url.startsWith('/residents/') && location.pathname.includes('/public/')) {
    const prefix = location.pathname.slice(0, location.pathname.indexOf('/public/')) + '/public';
    return prefix + url;
  }
  return url;
}

function releases() {
  const resident = requireResident();
  if (!Array.isArray(resident.releases)) resident.releases = [];
  resident.releases.forEach(normalizeRelease);
  return resident.releases;
}

function normalizeRelease(release) {
  release.published = release.published !== false;
  release.autoNews = release.autoNews !== false;
  release.featured = !!release.featured;
  release.releaseDate = release.releaseDate || release.date || '';
  release.date = release.releaseDate;
  release.title = release.title || '';
  release.label = release.label || '';
  release.releaseType = release.releaseType || '';
  release.format = release.format || '';
  release.country = release.country || '';
  release.artists = Array.isArray(release.artists) ? release.artists : splitLines(release.artists);
  release.coverUrl = release.coverUrl || release.coverImage || release.cover || release.imageUrl || '';
  release.coverImage = release.coverUrl;
  release.tracks = Array.isArray(release.tracks) ? release.tracks.map(track => typeof track === 'string' ? track : (track.title || track.name || '')).filter(Boolean) : splitLines(release.tracks);
  return release;
}

function splitLines(value) {
  return String(value || '').split(/\n|\|/).map(item => item.trim()).filter(Boolean);
}

function joinLines(value) {
  return Array.isArray(value) ? value.map(item => typeof item === 'string' ? item : (item.title || item.name || '')).filter(Boolean).join('\n') : String(value || '');
}

function input(id, label, value, type = 'text') {
  return `<div class="field"><label class="label">${label}</label><input class="input" id="${id}" type="${type}" value="${escapeHtml(value || '')}"></div>`;
}

function area(id, label, value, extra = '') {
  return `<div class="field ${extra}"><label class="label">${label}</label><textarea class="input auto-textarea" id="${id}">${escapeHtml(value || '')}</textarea></div>`;
}

function selectedRelease() {
  const list = releases();
  if (state.selectedReleaseIndex >= list.length) state.selectedReleaseIndex = Math.max(0, list.length - 1);
  return list[state.selectedReleaseIndex];
}

function renderList() {
  const box = $('portalReleaseList');
  if (!box) return;
  const list = releases();
  box.innerHTML = list.length ? list.map((release, index) => `
    <button class="release-card ${index === state.selectedReleaseIndex ? 'active' : ''}" type="button" data-release-select="${index}">
      <strong>${escapeHtml(release.title || 'Ohne Titel')}</strong>
      <span>${escapeHtml(release.releaseDate || release.year || 'ohne Datum')} · ${escapeHtml(release.label || 'ohne Label')}</span>
    </button>`).join('') : '<p class="muted">Keine Releases.</p>';
}

function renderDetail() {
  const box = $('portalReleaseDetail');
  if (!box) return;
  const resident = requireResident();
  const release = selectedRelease();
  if (!release) {
    box.innerHTML = '<div class="notice">Links ein Release wählen oder neu anlegen.</div>';
    return;
  }

  box.innerHTML = `
    <div class="release-detail-header">
      <div class="release-detail-title"><h2>${escapeHtml(release.title || 'Ohne Titel')}</h2><p>${escapeHtml(resident.name || 'Resident')} · ${escapeHtml(release.releaseDate || release.year || 'ohne Datum')}</p></div>
      <div class="tools"><button class="tool" id="releaseDuplicateBtn" type="button">Release duplizieren</button><button class="tool danger" id="releaseDeleteBtn" type="button">Release löschen</button></div>
    </div>
    <section class="release-detail-section"><h3>Release</h3>
      <div class="release-checks"><label><input id="releasePublished" type="checkbox" ${release.published ? 'checked' : ''}> Published</label><label><input id="releaseAutoNews" type="checkbox" ${release.autoNews ? 'checked' : ''}> Auto News</label><label><input id="releaseFeatured" type="checkbox" ${release.featured ? 'checked' : ''}> Featured</label></div>
      <div class="form-grid">
        ${input('releaseDate', 'Release Date', release.releaseDate, 'date')}
        ${input('releaseYear', 'Year', release.year || '', 'number')}
        ${area('releaseTitle', 'Release-Name', release.title)}
        ${area('releaseLabel', 'Label', release.label)}
        ${area('releaseType', 'Release Type', release.releaseType)}
        ${area('releaseFormat', 'Format', release.format)}
        ${area('releaseCountry', 'Country', release.country)}
        ${area('releaseArtists', 'Artists, eine Zeile pro Artist', joinLines(release.artists))}
      </div>
    </section>
    <section class="release-detail-section"><h3>Thumbnail / Cover</h3>
      <img id="releaseCoverPreview" class="release-cover-preview" src="${escapeHtml(assetUrl(release.coverUrl))}" alt="">
      <div class="media-dropzone release-cover-drop" id="releaseCoverDrop"><strong>Release-Cover hier ablegen</strong><span>Wird nach GitHub hochgeladen und diesem Release zugeordnet.</span><div class="media-upload-status"></div></div>
      <div class="field media-hidden-url"><label class="label">Cover URL</label><input class="input" id="releaseCover" value="${escapeHtml(release.coverUrl || '')}"></div>
    </section>
    <section class="release-detail-section"><h3>Tracks</h3>${area('releaseTracks', 'Tracks, eine Zeile pro Track', joinLines(release.tracks), 'full')}</section>
    <section class="release-detail-section"><h3>Links</h3><div class="form-grid">${area('releaseDiscogs', 'Discogs URL', release.discogsUrl || '')}${area('releaseBeatport', 'Beatport URL', release.beatportUrl || '')}${area('releaseBandcamp', 'Bandcamp URL', release.bandcampUrl || '')}${area('releaseLabelUrl', 'Label URL', release.labelUrl || '')}</div></section>
    <section class="release-detail-section"><h3>Texte</h3>${area('releaseAutoNewsText', 'Auto News Text', release.autoNewsText || '', 'full')}${area('releaseDescription', 'Release Description', release.description || '', 'full')}</section>`;
}

function readDetail() {
  const release = selectedRelease();
  if (!release || !$('releaseTitle')) return;
  release.published = !!$('releasePublished').checked;
  release.autoNews = !!$('releaseAutoNews').checked;
  release.featured = !!$('releaseFeatured').checked;
  release.releaseDate = $('releaseDate').value || '';
  release.date = release.releaseDate;
  release.year = $('releaseYear').value || '';
  release.title = $('releaseTitle').value || '';
  release.label = $('releaseLabel').value || '';
  release.releaseType = $('releaseType').value || '';
  release.format = $('releaseFormat').value || '';
  release.country = $('releaseCountry').value || '';
  release.artists = splitLines($('releaseArtists').value);
  release.coverUrl = $('releaseCover').value || '';
  release.coverImage = release.coverUrl;
  release.tracks = splitLines($('releaseTracks').value);
  release.discogsUrl = $('releaseDiscogs').value.trim();
  release.beatportUrl = $('releaseBeatport').value.trim();
  release.bandcampUrl = $('releaseBandcamp').value.trim();
  release.labelUrl = $('releaseLabelUrl').value.trim();
  release.autoNewsText = $('releaseAutoNewsText').value;
  release.description = $('releaseDescription').value;
}

async function uploadCover(file, statusEl) {
  const preview = $('releaseCoverPreview');
  const localPreview = URL.createObjectURL(file);
  if (preview) preview.src = localPreview;
  statusEl.textContent = 'Lade Cover nach GitHub...';
  const release = selectedRelease();
  const blob = await imageToJpeg(file, { ratio: 1, width: 1000, height: 1000 });
  const path = `public/residents/media/${slug(requireResident().id || requireResident().name, 'resident')}/releases/${slug(release.title || 'release')}-cover-${Date.now()}.jpg`;
  const url = await uploadBlob(path, blob, state.token);
  release.coverUrl = url;
  release.coverImage = url;
  $('releaseCover').value = url;
  markDirty();
  statusEl.textContent = 'Hochgeladen: ' + url;
}

function bindDetail() {
  const box = $('portalReleaseDetail');
  box.addEventListener('input', () => { readDetail(); markDirty(); });
  box.addEventListener('change', () => { readDetail(); markDirty(); renderList(); });
  $('releaseDuplicateBtn')?.addEventListener('click', () => {
    readDetail();
    const copy = JSON.parse(JSON.stringify(selectedRelease() || {}));
    copy.title = (copy.title || 'Release') + ' Kopie';
    releases().push(normalizeRelease(copy));
    state.selectedReleaseIndex = releases().length - 1;
    markDirty();
    render();
  });
  $('releaseDeleteBtn')?.addEventListener('click', () => {
    if (!confirm('Release wirklich löschen?')) return;
    releases().splice(state.selectedReleaseIndex, 1);
    state.selectedReleaseIndex = Math.max(0, state.selectedReleaseIndex - 1);
    markDirty();
    render();
  });
  const drop = $('releaseCoverDrop');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  drop.appendChild(fileInput);
  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('dragover', event => event.preventDefault());
  drop.addEventListener('drop', async event => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try { await uploadCover(file, drop.querySelector('.media-upload-status')); }
    catch (error) { drop.querySelector('.media-upload-status').textContent = error.message; }
  });
  fileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await uploadCover(file, drop.querySelector('.media-upload-status')); }
    catch (error) { drop.querySelector('.media-upload-status').textContent = error.message; }
    event.target.value = '';
  });
}

export function render() {
  renderList();
  renderDetail();
  bindDetail();
}

export function read() {
  readDetail();
  return releases();
}

export function init() {
  const panel = $('panel-releases');
  if (!panel || panel.dataset.releasesBound === '1') return;
  panel.dataset.releasesBound = '1';
  panel.innerHTML = '<div class="releases-workflow"><aside class="panel release-list-panel"><div class="head"><div class="title"><span class="icon">R</span><h2>Releases</h2></div></div><div class="release-list-actions"><button class="tool" id="releaseNewBtn" type="button">+ Release</button><button class="tool" id="releaseSortBtn" type="button">Sortieren</button></div><div id="portalReleaseList"></div></aside><section class="release-detail-editor"><div id="portalReleaseDetail"></div></section></div>';

  $('portalReleaseList').addEventListener('click', event => {
    const button = event.target.closest('[data-release-select]');
    if (!button) return;
    readDetail();
    state.selectedReleaseIndex = Number(button.dataset.releaseSelect);
    render();
  });

  $('releaseNewBtn').addEventListener('click', () => {
    readDetail();
    releases().push(normalizeRelease({ published: true, autoNews: true, title: 'Neues Release', releaseType: 'EP', format: 'Digital', artists: [requireResident().name || ''], tracks: ['Neuer Track'] }));
    state.selectedReleaseIndex = releases().length - 1;
    markDirty();
    render();
  });

  $('releaseSortBtn').addEventListener('click', () => {
    readDetail();
    releases().sort((a, b) => (Number(!!b.featured) - Number(!!a.featured)) || String(b.releaseDate || b.year || '').localeCompare(String(a.releaseDate || a.year || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'de'));
    state.selectedReleaseIndex = 0;
    markDirty();
    render();
    setStatus('Releases sortiert. Noch nicht gespeichert.', 'ok');
  });
}
