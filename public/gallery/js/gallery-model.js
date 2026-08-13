const LOCAL_MEDIA_PREFIX = 'public/gallery/media/';

export function gallerySlug(value) {
  return String(value || 'gallery').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'gallery';
}

export function createPlaylistId(title = 'Neue Playlist') {
  return `${gallerySlug(title)}-${Date.now().toString(36)}`;
}

export function isGalleryMediaPath(value) {
  return String(value || '').startsWith(LOCAL_MEDIA_PREFIX) && !String(value).includes('..');
}

function normalizeImage(image, index) {
  if (!image || typeof image !== 'object' || Array.isArray(image)) throw new Error('Gallery-Bild muss ein Objekt sein.');
  const url = String(image.url || '').trim();
  if (!url) throw new Error('Gallery-Bildpfad fehlt.');
  if (/^(data:|blob:)/i.test(url)) throw new Error('Data- und Blob-URLs sind in Gallery-Daten nicht erlaubt.');
  if (!/^https?:\/\//i.test(url) && !isGalleryMediaPath(url)) throw new Error('Ungültiger lokaler Gallery-Bildpfad: ' + url);
  return { ...image, id: String(image.id || `image-${index + 1}`), url, alt: String(image.alt || ''), caption: String(image.caption || ''), order: Number.isFinite(Number(image.order)) ? Number(image.order) : index + 1 };
}

export function normalizeGallery(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Gallery muss ein JSON-Objekt sein.');
  if (!Array.isArray(value.playlists)) throw new Error('Gallery playlists[] fehlt.');
  const ids = value.playlists.map(item => String(item?.id || '').trim());
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Playlist-IDs müssen vorhanden und eindeutig sein.');
  if (ids.some(id => !/^[a-z0-9][a-z0-9-]*$/.test(id))) throw new Error('Playlist-ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
  const playlists = value.playlists.map((playlist, index) => {
    const images = (Array.isArray(playlist.images) ? playlist.images : []).map(normalizeImage).sort((a, b) => a.order - b.order).map((image, order) => ({ ...image, order: order + 1 }));
    const imageIds = images.map(image => image.id);
    if (new Set(imageIds).size !== imageIds.length) throw new Error('Bild-IDs müssen je Playlist eindeutig sein.');
    if (imageIds.some(id => !/^[a-z0-9][a-z0-9-]*$/.test(id))) throw new Error('Bild-ID darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.');
    const coverImage = String(playlist.coverImage || '').trim();
    if (coverImage && !images.some(image => image.url === coverImage)) throw new Error('Coverbild muss auf ein vorhandenes Playlist-Bild zeigen.');
    return { ...playlist, id: ids[index], title: String(playlist.title || '').trim(), year: String(playlist.year || '').trim(), description: String(playlist.description || '').trim(), enabled: playlist.enabled === true, order: Number.isFinite(Number(playlist.order)) ? Number(playlist.order) : index + 1, coverImage, images };
  }).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map((playlist, order) => ({ ...playlist, order: order + 1 }));
  return { ...value, schemaVersion: Number(value.schemaVersion) || 1, playlists };
}

export function moveGalleryItem(items, index, offset) {
  const target = index + offset;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, order) => ({ ...item, order: order + 1 }));
}

export function removeGalleryImage(playlist, imageId) {
  const images = playlist.images.filter(image => image.id !== imageId).map((image, order) => ({ ...image, order: order + 1 }));
  const coverImage = images.some(image => image.url === playlist.coverImage) ? playlist.coverImage : (images[0]?.url || '');
  return { ...playlist, images, coverImage };
}

export function playlistCover(playlist) {
  return playlist.images.some(image => image.url === playlist.coverImage) ? playlist.coverImage : (playlist.images[0]?.url || '');
}
