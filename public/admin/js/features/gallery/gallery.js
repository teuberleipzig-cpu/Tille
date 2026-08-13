import { createGitHubClient } from '../../core/github-client.js';
import { createPlaylistId, gallerySlug, isGalleryMediaPath, moveGalleryItem, normalizeGallery, removeGalleryImage } from '../../../../gallery/js/gallery-model.js';

const DATA_PATH = 'public/gallery/data/gallery.json';
const root = document.getElementById('view-gallery');
const list = root?.querySelector('[data-gallery-admin-list]');
const editor = root?.querySelector('[data-gallery-admin-editor]');
const status = root?.querySelector('[data-gallery-admin-status]');
let gallery = null;
let selectedId = '';
let loadedSha = '';
const previews = new Map();

function setStatus(message, type = 'ok') { status.textContent = message; status.className = `status ${type}`; }
function current() { return gallery?.playlists.find(item => item.id === selectedId) || null; }
function github() {
  const branch = document.getElementById('ghBranch').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  if (!branch) throw new Error('Bitte GitHub-Branch angeben.');
  if (!token) throw new Error('GitHub Token fehlt.');
  return createGitHubClient({ owner: document.getElementById('ghOwner').value, repo: document.getElementById('ghRepo').value, branch, token });
}
function openView() {
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'gallery'));
  document.querySelectorAll('main>section').forEach(section => section.classList.add('hidden'));
  root.classList.remove('hidden');
  document.getElementById('viewTitle').textContent = 'Gallery';
  document.getElementById('viewSubline').textContent = 'Playlists und historische Bilder verwalten.';
  if (innerWidth <= 1024) document.getElementById('sidebar').classList.remove('open');
}
function addSidebarEntry() {
  const navigation = document.querySelector('[data-view="site-navigation"]');
  const section = navigation?.closest('.nav-section');
  if (!section || document.querySelector('[data-view="gallery"]')) return;
  const button = document.createElement('button');
  button.className = 'nav-btn'; button.type = 'button'; button.dataset.view = 'gallery';
  button.innerHTML = '<span class="nav-ico">G</span>Gallery';
  button.addEventListener('click', openView); section.append(button);
}
function markChanged() { setStatus('Ungespeicherte Änderungen.', 'warn'); }
function readFields() {
  const playlist = current(); if (!playlist) return;
  playlist.title = root.querySelector('[data-gallery-title]').value.trim();
  playlist.year = root.querySelector('[data-gallery-year]').value.trim();
  playlist.description = root.querySelector('[data-gallery-description]').value.trim();
  playlist.enabled = root.querySelector('[data-gallery-enabled]').checked;
}
function renderList() {
  if (!gallery) { list.innerHTML = '<p class="muted">Gallery noch nicht geladen.</p>'; return; }
  list.innerHTML = gallery.playlists.map((playlist, index) => `<div class="gallery-list-row ${playlist.id === selectedId ? 'active' : ''}" data-playlist-id="${playlist.id}"><button type="button" data-gallery-select><strong>${escapeHtml(playlist.title || 'Neue Playlist')}</strong><span>${playlist.images.length} Bilder · ${playlist.enabled ? 'aktiv' : 'inaktiv'}</span></button><div class="tools"><button class="tool" type="button" data-playlist-up ${index === 0 ? 'disabled' : ''}>↑</button><button class="tool" type="button" data-playlist-down ${index === gallery.playlists.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join('') || '<p class="muted">Noch keine Playlists.</p>';
  list.querySelectorAll('[data-playlist-id]').forEach(row => {
    const id = row.dataset.playlistId;
    row.querySelector('[data-gallery-select]').onclick = () => { readFields(); selectedId = id; render(); };
    row.querySelector('[data-playlist-up]').onclick = () => { readFields(); gallery.playlists = moveGalleryItem(gallery.playlists, gallery.playlists.findIndex(item => item.id === id), -1); markChanged(); render(); };
    row.querySelector('[data-playlist-down]').onclick = () => { readFields(); gallery.playlists = moveGalleryItem(gallery.playlists, gallery.playlists.findIndex(item => item.id === id), 1); markChanged(); render(); };
  });
}
function renderEditor() {
  const playlist = current();
  if (!playlist) { editor.innerHTML = '<div class="notice">Playlist auswählen oder neu anlegen.</div>'; return; }
  editor.innerHTML = `<div class="form-grid"><div class="field"><label class="label">Titel</label><input class="input" data-gallery-title value="${escapeHtml(playlist.title)}"></div><div class="field"><label class="label">Jahr</label><input class="input" data-gallery-year value="${escapeHtml(playlist.year)}"></div><div class="field full"><label class="label">Beschreibung</label><textarea class="textarea" data-gallery-description>${escapeHtml(playlist.description)}</textarea></div><label class="checkline field full"><input type="checkbox" data-gallery-enabled ${playlist.enabled ? 'checked' : ''}> Aktiv / veröffentlicht</label></div><label class="gallery-upload">Bilder hochladen<input type="file" multiple accept="image/*" data-gallery-upload></label><div class="gallery-image-list">${playlist.images.map((image, index) => `<div class="gallery-image-row" data-image-id="${image.id}"><img src="${escapeHtml(previews.get(image.id) || image.url)}" alt=""><div class="gallery-image-fields"><input class="input" data-image-alt placeholder="Alt-Text" value="${escapeHtml(image.alt)}"><input class="input" data-image-caption placeholder="Caption" value="${escapeHtml(image.caption)}"></div><div class="tools"><button class="tool" type="button" data-image-up ${index === 0 ? 'disabled' : ''}>↑</button><button class="tool" type="button" data-image-down ${index === playlist.images.length - 1 ? 'disabled' : ''}>↓</button><button class="tool" type="button" data-image-cover ${playlist.coverImage === image.url ? 'disabled' : ''}>Cover</button><button class="tool danger" type="button" data-image-remove>Entfernen</button></div></div>`).join('')}</div><div class="tools" style="margin-top:16px"><button class="btn danger" type="button" data-gallery-delete-playlist>Playlist löschen</button></div>`;
  editor.querySelectorAll('[data-gallery-title],[data-gallery-year],[data-gallery-description],[data-gallery-enabled]').forEach(field => field.addEventListener('input', () => { readFields(); markChanged(); renderList(); }));
  editor.querySelector('[data-gallery-upload]').addEventListener('change', event => uploadFiles([...event.target.files]));
  editor.querySelector('[data-gallery-delete-playlist]').onclick = deletePlaylist;
  editor.querySelectorAll('[data-image-id]').forEach(row => bindImageRow(row, playlist));
}
function bindImageRow(row, playlist) {
  const index = playlist.images.findIndex(image => image.id === row.dataset.imageId); const image = playlist.images[index];
  row.querySelector('[data-image-alt]').oninput = event => { image.alt = event.target.value; markChanged(); };
  row.querySelector('[data-image-caption]').oninput = event => { image.caption = event.target.value; markChanged(); };
  row.querySelector('[data-image-up]').onclick = () => { playlist.images = moveGalleryItem(playlist.images, index, -1); markChanged(); render(); };
  row.querySelector('[data-image-down]').onclick = () => { playlist.images = moveGalleryItem(playlist.images, index, 1); markChanged(); render(); };
  row.querySelector('[data-image-cover]').onclick = () => { playlist.coverImage = image.url; markChanged(); render(); };
  row.querySelector('[data-image-remove]').onclick = () => removeImage(image);
}
function render() { renderList(); renderEditor(); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function fileBase64(file) { return file.arrayBuffer().then(buffer => { let binary = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(binary); }); }
function safeFileName(name) { const dot = name.lastIndexOf('.'); const ext = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '') : ''; return `${gallerySlug(dot >= 0 ? name.slice(0, dot) : name)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}${ext}`; }
async function uploadFiles(files) {
  const playlist = current(); if (!playlist || !files.length) return;
  if (files.some(file => !file.type.startsWith('image/'))) return setStatus('Nur Bilddateien können hochgeladen werden.', 'err');
  setStatus(`Lade ${files.length} Bild(er) hoch...`, 'warn');
  try {
    const client = github();
    for (const file of files) {
      const path = `public/gallery/media/${gallerySlug(playlist.id)}/${safeFileName(file.name)}`;
      await client.putBase64File(path, await fileBase64(file), '', `Upload gallery image for ${playlist.id}`);
      const image = { id: `image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, url: path, alt: '', caption: '', order: playlist.images.length + 1 };
      previews.set(image.id, URL.createObjectURL(file)); playlist.images.push(image);
      if (!playlist.coverImage) playlist.coverImage = path;
    }
    markChanged(); render();
  } catch (error) { setStatus(error.message || 'Bilder konnten nicht hochgeladen werden.', 'err'); }
}
async function removeImage(image) {
  if (!confirm('Bild aus Playlist und GitHub entfernen?')) return;
  if (!isGalleryMediaPath(image.url)) return setStatus('Löschen blockiert: Bild liegt nicht unter public/gallery/media/.', 'err');
  setStatus('Lösche Gallery-Bild...', 'warn');
  try { const client = github(); const file = await client.getFile(image.url); await client.deleteFile(image.url, file.sha, 'Delete gallery image'); const playlist = current(); Object.assign(playlist, removeGalleryImage(playlist, image.id)); markChanged(); render(); } catch (error) { setStatus(error.message || 'Bild konnte nicht gelöscht werden.', 'err'); }
}
function addPlaylist() { if (!gallery) return setStatus('Gallery zuerst laden.', 'err'); readFields(); const id = createPlaylistId(); gallery.playlists.push({ id, title: 'Neue Playlist', year: '', description: '', enabled: false, order: gallery.playlists.length + 1, coverImage: '', images: [] }); selectedId = id; markChanged(); render(); }
function deletePlaylist() { const playlist = current(); if (!playlist || !confirm('Playlist wirklich löschen? Medien werden nicht rekursiv gelöscht.')) return; gallery.playlists = gallery.playlists.filter(item => item.id !== playlist.id).map((item, order) => ({ ...item, order: order + 1 })); selectedId = gallery.playlists[0]?.id || ''; markChanged(); render(); }
async function loadGallery() { setStatus('Lade Gallery...', 'warn'); try { const file = await github().getTextFile(DATA_PATH); gallery = normalizeGallery(JSON.parse(file.text)); loadedSha = file.sha; selectedId = gallery.playlists[0]?.id || ''; render(); setStatus('Gallery geladen.', 'ok'); } catch (error) { setStatus(error.message || 'Gallery konnte nicht geladen werden.', 'err'); } }
async function saveGallery() { setStatus('Speichere Gallery...', 'warn'); try { readFields(); const next = normalizeGallery(gallery); const client = github(); const fresh = await client.getTextFile(DATA_PATH); if (!loadedSha || fresh.sha !== loadedSha) throw new Error('Gallery wurde zwischenzeitlich geändert. Bitte neu laden.'); const result = await client.putTextFile(DATA_PATH, JSON.stringify(next, null, 2) + '\n', fresh.sha, 'Update gallery from admin v2'); loadedSha = result.content?.sha || ''; gallery = next; render(); setStatus('Gallery gespeichert.', 'ok'); } catch (error) { setStatus(error.message || 'Gallery konnte nicht gespeichert werden.', 'err'); } }

root?.querySelector('[data-gallery-load]')?.addEventListener('click', loadGallery);
root?.querySelector('[data-gallery-save]')?.addEventListener('click', saveGallery);
root?.querySelector('[data-gallery-new]')?.addEventListener('click', addPlaylist);
document.getElementById('topLoadBtn')?.addEventListener('click', event => { if (!root.classList.contains('hidden')) { event.stopImmediatePropagation(); loadGallery(); } }, true);
document.getElementById('topSaveBtn')?.addEventListener('click', event => { if (!root.classList.contains('hidden')) { event.stopImmediatePropagation(); saveGallery(); } }, true);
addSidebarEntry(); render();
