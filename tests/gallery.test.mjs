import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { moveGalleryItem, normalizeGallery, playlistCover, removeGalleryImage } from '../public/gallery/js/gallery-model.js';
import { saveGalleryData, stageGalleryImageDelete } from '../public/admin/js/features/gallery/gallery-save.js';

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
  const css = await readFile(new URL('../assets/gallery.css', import.meta.url), 'utf8');
  const page = await readFile(new URL('../public/gallery/js/gallery-page.js', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../public/admin/js/features/gallery/gallery.js', import.meta.url), 'utf8');
  const save = await readFile(new URL('../public/admin/js/features/gallery/gallery-save.js', import.meta.url), 'utf8');
  assert.match(html, /data-lightbox-prev/); assert.match(html, /data-lightbox-next/); assert.match(html, /assets\/site-navigation\.js/);
  assert.match(html, /gallery\.css\?v=gallery-4/);
  for (const shellRule of [/--grey:#d9d9d9/, /\.page\{width:800px;[^}]*grid-template-columns:606px 194px/, /\.main\{[^}]*padding:18px 58px 14px 30px/, /\.logo\{width:280px;height:78px;margin:0 0 8px -35px/, /\.nav\{width:520px;[^}]*font-size:13px/, /\.nav a\{[^}]*background:var\(--grey\)/, /\.nav a:hover,\.nav a\.active\{color:#fff;background:#000\}/]) assert.match(css, shellRule);
  assert.match(page, /Escape/); assert.match(page, /ArrowLeft/); assert.match(page, /ArrowRight/); assert.match(page, /Gallery konnte nicht geladen werden/);
  assert.match(admin, /multiple accept="image\/\*"/); assert.match(admin, /getTextFile\(DATA_PATH\)/); assert.match(save, /fresh\.sha !== loadedSha/);
});

test('image delete is staged locally without physical delete', () => {
  const pending = new Set(); const images = [image('a', 1)];
  const next = stageGalleryImageDelete({ ...playlist('one'), images, coverImage: images[0].url }, images[0], pending);
  assert.equal(next.images.length, 0); assert.deepEqual([...pending], [images[0].url]);
});

test('SHA conflict prevents JSON write and media cleanup', async () => {
  const calls = []; const pending = new Set([image('a', 1).url]);
  const client = { getTextFile: async () => ({ sha: 'fresh' }), putTextFile: async () => calls.push('put'), getFile: async () => calls.push('get-media'), deleteFile: async () => calls.push('delete') };
  await assert.rejects(() => saveGalleryData({ client, dataPath: 'gallery.json', next: empty, loadedSha: 'old', pendingMediaDeletes: pending }), /zwischenzeitlich/);
  assert.deepEqual(calls, []); assert.equal(pending.size, 1);
});

test('successful JSON write happens before media cleanup', async () => {
  const calls = []; const path = image('a', 1).url; const pending = new Set([path]);
  const client = { getTextFile: async () => ({ sha: 'same' }), putTextFile: async () => { calls.push('put-json'); return { content: { sha: 'next' } }; }, getFile: async () => { calls.push('get-media'); return { sha: 'media' }; }, deleteFile: async () => calls.push('delete-media') };
  const result = await saveGalleryData({ client, dataPath: 'gallery.json', next: empty, loadedSha: 'same', pendingMediaDeletes: pending });
  assert.deepEqual(calls, ['put-json', 'get-media', 'delete-media']); assert.equal(result.loadedSha, 'next'); assert.equal(pending.size, 0);
});

test('cleanup failure leaves orphan queued after successful JSON write', async () => {
  const path = image('a', 1).url; const pending = new Set([path]); let jsonWritten = false;
  const client = { getTextFile: async () => ({ sha: 'same' }), putTextFile: async () => { jsonWritten = true; return { content: { sha: 'next' } }; }, getFile: async () => { throw new Error('cleanup failed'); } };
  const result = await saveGalleryData({ client, dataPath: 'gallery.json', next: empty, loadedSha: 'same', pendingMediaDeletes: pending });
  assert.equal(jsonWritten, true); assert.equal(result.cleanupFailures.length, 1); assert.equal(pending.has(path), true);
});

test('404 cleanup is treated as already removed', async () => {
  const path = image('a', 1).url; const pending = new Set([path]);
  const client = { getTextFile: async () => ({ sha: 'same' }), putTextFile: async () => ({ content: { sha: 'next' } }), getFile: async () => { const error = new Error('missing'); error.status = 404; throw error; } };
  const result = await saveGalleryData({ client, dataPath: 'gallery.json', next: empty, loadedSha: 'same', pendingMediaDeletes: pending });
  assert.equal(result.cleanupFailures.length, 0); assert.equal(pending.size, 0);
});

test('delete staging rejects paths outside Gallery media', () => {
  assert.throws(() => stageGalleryImageDelete({ ...playlist('one'), images: [] }, { id: 'x', url: 'public/events/media/x.jpg' }, new Set()), /blockiert/);
});

test('fresh Gallery load clears stale pending deletes', async () => {
  const admin = await readFile(new URL('../public/admin/js/features/gallery/gallery.js', import.meta.url), 'utf8');
  assert.match(admin, /loadedSha = file\.sha; pendingMediaDeletes\.clear\(\)/);
});

test('cache-busting references are current', async () => {
  const root = new URL('../', import.meta.url); const names = ['404.html','about.html','contact.html','datenschutz.html','event.html','feedback-thanks.html','feedback.html','history.html','impressum.html','index.html','news.html','resident-releases.html','residents.html','gallery.html'];
  for (const name of names) { const html = await readFile(new URL(name, root), 'utf8'); assert.doesNotMatch(html, /site-navigation\.js\?v=site-navigation-[1-5]/); assert.match(html, /site-navigation\.js\?v=site-navigation-6/); }
  const admin = await readFile(new URL('../public/admin/index.html', import.meta.url), 'utf8'); assert.match(admin, /gallery\.js\?v=gallery-admin-2/);
});
