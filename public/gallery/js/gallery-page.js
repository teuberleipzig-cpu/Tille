import { normalizeGallery, playlistCover } from './gallery-model.js';

const root = document.getElementById('gallery-content');
let lightboxImages = [];
let lightboxIndex = 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const imageAlt = (playlist, image, index) => image.alt || `${playlist.title || 'Distillery Gallery'} – Bild ${index + 1}`;

function showLightbox(index) {
  lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
  const item = lightboxImages[lightboxIndex];
  const box = document.getElementById('gallery-lightbox');
  box.querySelector('img').src = item.url;
  box.querySelector('img').alt = item.alt;
  box.querySelector('[data-lightbox-caption]').textContent = item.caption;
  box.hidden = false;
  box.querySelector('[data-lightbox-close]').focus();
}

function closeLightbox() { document.getElementById('gallery-lightbox').hidden = true; }

function bindLightbox() {
  document.querySelectorAll('[data-gallery-image]').forEach(button => button.addEventListener('click', () => showLightbox(Number(button.dataset.galleryImage))));
}

function renderOverview(config) {
  const playlists = config.playlists.filter(item => item.enabled);
  if (!playlists.length) { root.innerHTML = '<h1>Gallery</h1><p class="gallery-empty">Noch keine Gallery-Playlists veröffentlicht.</p>'; return; }
  root.innerHTML = `<h1>Gallery</h1><div class="gallery-playlists">${playlists.map(playlist => { const cover = playlistCover(playlist); return `<a class="gallery-playlist" href="gallery.html?playlist=${encodeURIComponent(playlist.id)}">${cover ? `<img src="${esc(cover)}" alt="${esc(playlist.title)}">` : '<span class="gallery-placeholder">Gallery</span>'}<strong>${esc(playlist.title || 'Ohne Titel')}</strong>${playlist.year ? `<small>${esc(playlist.year)}</small>` : ''}${playlist.description ? `<p>${esc(playlist.description)}</p>` : ''}</a>`; }).join('')}</div>`;
}

function renderPlaylist(playlist) {
  lightboxImages = playlist.images.map((image, index) => ({ ...image, alt: imageAlt(playlist, image, index) }));
  root.innerHTML = `<a class="gallery-back" href="gallery.html">← Gallery</a><h1>${esc(playlist.title || 'Gallery')}</h1>${playlist.year ? `<p class="gallery-year">${esc(playlist.year)}</p>` : ''}${playlist.description ? `<p class="gallery-description">${esc(playlist.description)}</p>` : ''}<div class="gallery-images">${lightboxImages.map((image, index) => `<button type="button" data-gallery-image="${index}"><img src="${esc(image.url)}" alt="${esc(image.alt)}">${image.caption ? `<span>${esc(image.caption)}</span>` : ''}</button>`).join('')}</div>`;
  bindLightbox();
}

async function initialise() {
  try {
    const response = await fetch('public/gallery/data/gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error();
    const config = normalizeGallery(await response.json());
    const selected = new URLSearchParams(location.search).get('playlist');
    if (!selected) return renderOverview(config);
    const playlist = config.playlists.find(item => item.id === selected && item.enabled);
    if (!playlist) throw new Error();
    renderPlaylist(playlist);
  } catch (_) { root.innerHTML = '<h1>Gallery</h1><p class="gallery-error">Gallery konnte nicht geladen werden.</p>'; }
}

document.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
document.querySelector('[data-lightbox-prev]').addEventListener('click', () => showLightbox(lightboxIndex - 1));
document.querySelector('[data-lightbox-next]').addEventListener('click', () => showLightbox(lightboxIndex + 1));
document.addEventListener('keydown', event => { if (document.getElementById('gallery-lightbox').hidden) return; if (event.key === 'Escape') closeLightbox(); if (event.key === 'ArrowLeft') showLightbox(lightboxIndex - 1); if (event.key === 'ArrowRight') showLightbox(lightboxIndex + 1); });
initialise();
