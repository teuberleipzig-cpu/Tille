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

function residentFolder() {
  const resident = requireResident();
  return slug(resident.id || resident.name || 'resident', 'resident');
}

function photoUrls(resident) {
  const source = Array.isArray(resident.photoList) && resident.photoList.length ? resident.photoList : (Array.isArray(resident.photos) ? resident.photos : []);
  return source.map(item => typeof item === 'string' ? item : (item.url || item.src || '')).filter(Boolean);
}

function setPhotoUrls(urls) {
  const resident = requireResident();
  resident.photoList = urls.map(url => ({ url }));
  resident.photos = resident.photoList;
  const textarea = $('resPhotos');
  if (textarea) textarea.value = urls.join('\n');
  markDirty();
}

function renderPhotos() {
  const box = $('residentPhotosList');
  if (!box) return;
  const urls = photoUrls(requireResident());
  box.innerHTML = urls.length ? urls.map((url, index) => `
    <div class="resident-photo-card" data-photo-index="${index}">
      <img src="${escapeHtml(assetUrl(url))}" alt="">
      <div class="tools" style="margin-top:10px"><button class="tool" type="button" data-photo-left>←</button><button class="tool" type="button" data-photo-right>→</button></div>
      <div class="tools" style="margin-top:10px"><button class="tool danger" type="button" data-photo-delete>Löschen</button></div>
    </div>`).join('') : '<p class="muted">Noch keine Fotos.</p>';
}

function renderDropzones() {
  const presskitSlot = $('residentPresskitSlot');
  const photosSlot = $('residentPhotosDropSlot');

  if (presskitSlot && !presskitSlot.querySelector('[data-presskit-drop]')) {
    presskitSlot.innerHTML = '<div class="media-dropzone" data-presskit-drop><strong>Presskit hier ablegen</strong><span>PDF oder ZIP wird nach GitHub hochgeladen und als Pfad gespeichert.</span><div class="media-upload-status"></div></div>';
  }

  if (photosSlot && !photosSlot.querySelector('[data-photo-drop]')) {
    photosSlot.innerHTML = '<div class="media-dropzone" data-photo-drop><strong>Bild hier ablegen</strong><span>Wird nach GitHub hochgeladen und der Fotoliste hinzugefügt.</span><div class="media-upload-status"></div></div>';
  }
}

async function uploadPresskit(file, statusEl) {
  statusEl.textContent = 'Lade Presskit nach GitHub...';
  const ext = String(file.name || '').split('.').pop() || 'pdf';
  const path = `public/residents/media/${residentFolder()}/presskit/presskit-${Date.now()}.${slug(ext, 'pdf')}`;
  const url = await uploadBlob(path, file, state.token);
  const resident = requireResident();
  resident.presskitUrl = url;
  resident.presskit = url;
  $('resPresskit').value = url;
  markDirty();
  statusEl.textContent = 'Hochgeladen: ' + url;
}

async function uploadPhoto(file, statusEl) {
  const localPreview = URL.createObjectURL(file);
  statusEl.textContent = 'Lade Foto nach GitHub...';
  const blob = await imageToJpeg(file, { ratio: 16 / 9, width: 1600, height: 900 });
  const path = `public/residents/media/${residentFolder()}/photos/photo-${Date.now()}.jpg`;
  const url = await uploadBlob(path, blob, state.token);
  const urls = photoUrls(requireResident());
  urls.push(url);
  setPhotoUrls(urls);
  renderPhotos();
  const cards = $('residentPhotosList')?.querySelectorAll('.resident-photo-card img');
  const last = cards?.[cards.length - 1];
  if (last) last.src = localPreview;
  statusEl.textContent = 'Hochgeladen: ' + url;
}

function handleFileDrop(zone, uploadFn) {
  const input = document.createElement('input');
  input.type = 'file';
  input.style.display = 'none';
  zone.appendChild(input);
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await uploadFn(file, zone.querySelector('.media-upload-status')); }
    catch (error) { zone.querySelector('.media-upload-status').textContent = error.message; }
    event.target.value = '';
  });
  zone.addEventListener('dragover', event => event.preventDefault());
  zone.addEventListener('drop', async event => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try { await uploadFn(file, zone.querySelector('.media-upload-status')); }
    catch (error) { zone.querySelector('.media-upload-status').textContent = error.message; }
  });
}

export function render() {
  const resident = requireResident();
  $('resPresskit').value = resident.presskitUrl || resident.presskit || resident.pressKitUrl || '';
  $('resPhotos').value = photoUrls(resident).join('\n');
  $('resEmbeds').value = (Array.isArray(resident.embeds) ? resident.embeds : (Array.isArray(resident.mediaEmbeds) ? resident.mediaEmbeds : [])).join('\n');
  renderDropzones();
  renderPhotos();
}

export function read() {
  const resident = requireResident();
  const photoList = String($('resPhotos')?.value || '').split(/\n+/).map(item => item.trim()).filter(Boolean).map(url => ({ url }));
  resident.photoList = photoList;
  resident.photos = photoList;
  resident.presskitUrl = $('resPresskit')?.value || resident.presskitUrl || '';
  resident.embeds = String($('resEmbeds')?.value || '').split(/\n+/).map(item => item.trim()).filter(Boolean);
  resident.mediaEmbeds = resident.embeds;
  return resident;
}

export function init() {
  const panel = $('panel-media');
  if (!panel || panel.dataset.mediaBound === '1') return;
  panel.dataset.mediaBound = '1';

  renderDropzones();
  const pressDrop = panel.querySelector('[data-presskit-drop]');
  const photoDrop = panel.querySelector('[data-photo-drop]');
  if (pressDrop) handleFileDrop(pressDrop, uploadPresskit);
  if (photoDrop) handleFileDrop(photoDrop, uploadPhoto);

  $('resEmbeds')?.addEventListener('input', () => { read(); markDirty(); });

  $('residentPhotosList')?.addEventListener('click', event => {
    const card = event.target.closest('[data-photo-index]');
    if (!card) return;
    const index = Number(card.dataset.photoIndex);
    const urls = photoUrls(requireResident());
    if (event.target.matches('[data-photo-left]') && index > 0) {
      const item = urls.splice(index, 1)[0];
      urls.splice(index - 1, 0, item);
    }
    if (event.target.matches('[data-photo-right]') && index < urls.length - 1) {
      const item = urls.splice(index, 1)[0];
      urls.splice(index + 1, 0, item);
    }
    if (event.target.matches('[data-photo-delete]')) urls.splice(index, 1);
    setPhotoUrls(urls);
    renderPhotos();
  });
}
