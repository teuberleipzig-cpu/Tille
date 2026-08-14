import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { residentDirectoryItems, shouldShowResidentDirectory } from '../public/site/js/resident-directory.js';

const moduleSource = await readFile(new URL('../public/site/js/resident-directory.js', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../residents.html', import.meta.url), 'utf8');
const id = resident => resident.id;
const photos = resident => resident.photos || [];

test('mobile landing without query uses directory mode', () => {
  assert.equal(shouldShowResidentDirectory('', true), true);
  assert.equal(shouldShowResidentDirectory('?search=x', true), true);
});

test('desktop landing and mobile resident query use detail mode', () => {
  assert.equal(shouldShowResidentDirectory('', false), false);
  assert.equal(shouldShowResidentDirectory('?resident=bigalke', true), false);
});

test('directory preserves order, first photo, placeholder state, and encoded links', () => {
  const items = residentDirectoryItems([{ id: 'a/b', name: 'First', photos: ['one.jpg','two.jpg'] }, { id: 'second', name: 'Second' }], id, photos);
  assert.deepEqual(items.map(item => item.name), ['First','Second']);
  assert.equal(items[0].photo, 'one.jpg');
  assert.equal(items[0].href, 'residents.html?resident=a%2Fb');
  assert.equal(items[1].photo, '');
});

test('directory renderer contains cards only, without embeds or social controls', () => {
  assert.doesNotMatch(moduleSource, /iframe|social-icon|YouTube|SoundCloud/);
  assert.match(moduleSource, /resident-directory-placeholder/);
  assert.match(moduleSource, /document\.createElement\('a'\)/);
});

test('resident page retains detail embeds and existing slider contract', () => {
  assert.match(pageSource, /function renderEmbeds\(r\)/);
  assert.match(pageSource, /function setupSlider\(r\)/);
  assert.match(pageSource, /history\.replaceState/);
  assert.match(pageSource, /resident-directory-mode \.sidebar\{display:none\}/);
});
