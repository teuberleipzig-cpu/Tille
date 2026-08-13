import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { moveGalleryItem, normalizeGallery, playlistCover, removeGalleryImage } from '../public/gallery/js/gallery-model.js';

const empty = JSON.parse(await readFile(new URL('../public/gallery/data/gallery.json', import.meta.url), 'utf8'));
const image = (id, order, url = `public/gallery/media/history/${id}.jpg`) => ({ id, url, alt: '', caption: '', order });
const playlist = (id, order = 1) => ({ id, title: id, year: '', description: '', enabled: true, order, coverImage: '', images: [] });

test('empty gallery is valid', () => assert.deepEqual(normalizeGallery(empty).playlists, []));
test('playlist ids must be unique', () => assert.throws(() => normalizeGallery({ playlists: [playlist('same'), playlist('same', 2)] }), /eindeutig/));
test('playlist and image order normalize deterministically', () => {
  const value = normalizeGallery({ playlists: [{ ...playlist('second', 2), images: [image('b', 2), image('a', 1)] }, playlist('first', 1)] });
  assert.deepEqual(value.playlists.map(item => item.id), ['first', 'second']);
  assert.deepEqual(value.playlists[1].images.map(item => item.id), ['a', 'b']);
});
test('enabled is normalized as strict boolean', () => assert.equal(normalizeGallery({ playlists: [{ ...playlist('one'), enabled: 'true' }] }).playlists[0].enabled, false));
test('data and blob URLs are rejected', () => {
  for (const url of ['data:image/jpeg;base64,AA', 'blob:http://localhost/example']) assert.throws(() => normalizeGallery({ playlists: [{ ...playlist('one'), images: [image('a', 1, url)] }] }), /nicht erlaubt/);
});
test('invalid local media path is rejected', () => assert.throws(() => normalizeGallery({ playlists: [{ ...playlist('one'), images: [image('a', 1, 'public/events/media/a.jpg')] }] }), /Ungültiger/));
test('unknown fields survive normalization', () => {
  const value = normalizeGallery({ schemaVersion: 1, future: 7, playlists: [{ ...playlist('one'), futurePlaylist: 8, images: [{ ...image('a', 1), futureImage: 9 }] }] });
  assert.equal(value.future, 7); assert.equal(value.playlists[0].futurePlaylist, 8); assert.equal(value.playlists[0].images[0].futureImage, 9);
});
test('cover must reference a playlist image and falls back to first image', () => {
  const images = [image('a', 1), image('b', 2)];
  const valid = normalizeGallery({ playlists: [{ ...playlist('one'), images, coverImage: images[1].url }] }).playlists[0];
  assert.equal(playlistCover(valid), images[1].url);
  assert.throws(() => normalizeGallery({ playlists: [{ ...playlist('one'), images, coverImage: 'public/gallery/media/history/missing.jpg' }] }), /vorhandenes/);
});
test('removing cover selects first remaining image', () => {
  const images = [image('a', 1), image('b', 2)];
  const value = removeGalleryImage({ ...playlist('one'), images, coverImage: images[0].url }, 'a');
  assert.equal(value.coverImage, images[1].url);
});
test('moving gallery items preserves normalized order', () => {
  const moved = moveGalleryItem([playlist('a', 1), playlist('b', 2)], 1, -1);
  assert.deepEqual(moved.map(item => item.id), ['b', 'a']); assert.deepEqual(moved.map(item => item.order), [1, 2]);
});

test('public and admin Gallery shells expose required controls', async () => {
  const html = await readFile(new URL('../gallery.html', import.meta.url), 'utf8');
  const page = await readFile(new URL('../public/gallery/js/gallery-page.js', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../public/admin/js/features/gallery/gallery.js', import.meta.url), 'utf8');
  assert.match(html, /data-lightbox-prev/); assert.match(html, /data-lightbox-next/); assert.match(html, /assets\/site-navigation\.js/);
  assert.match(page, /Escape/); assert.match(page, /ArrowLeft/); assert.match(page, /ArrowRight/); assert.match(page, /Gallery konnte nicht geladen werden/);
  assert.match(admin, /multiple accept="image\/\*"/); assert.match(admin, /getTextFile\(DATA_PATH\)/); assert.match(admin, /fresh\.sha !== loadedSha/);
});
