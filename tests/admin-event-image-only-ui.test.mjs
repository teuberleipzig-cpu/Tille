import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');
const [html, app, textareas, meta, autoLoad, ui, csv] = await Promise.all([
  source('public/admin/index.html'),
  source('public/admin/js/admin-app.js'),
  source('public/admin/js/textareas.js'),
  source('public/admin/js/events-meta.js'),
  source('public/admin/js/auto-github-load.js'),
  source('public/admin/js/event-image-only-ui.js'),
  source('public/admin/js/events-csv-import.js')
]);

test('Admin loads cache-busted image-only Event modules', () => {
  for (const file of ['admin-app.js', 'events-meta.js', 'auto-github-load.js', 'events-csv-import.js']) assert.match(html, new RegExp(`${file.replaceAll('.', '\\.')}\\?v=event-image-only-1`));
  assert.match(meta, /event-image-only-ui\.js\?v=event-image-only-ui-1/);
});

test('Event base fields are read-only or disabled while image URL is explicitly active', () => {
  for (const id of ['evDate', 'evTitle', 'evMoreUrl', 'evDescription']) assert.match(ui, new RegExp(`['\"]${id}['\"]`));
  assert.match(ui, /disable\('evColor'\)/);
  assert.match(ui, /image\.disabled=false/);
  assert.match(ui, /image\.readOnly=false/);
  assert.match(ui, /Eventbild speichern/);
});

test('lineup inputs are read-only and all section and artist mutation controls are disabled', () => {
  for (const selector of ['data-section-label', 'data-section-genre', 'data-artist-name', 'data-artist-info', 'data-artist-link']) assert.match(app, new RegExp(`${selector}[^>]+readonly`));
  for (const selector of ['data-add-artist', 'data-remove-artist', 'data-move-artist', 'data-remove-section', 'data-move-section']) assert.match(app, new RegExp(`${selector}[^>]+disabled`));
  assert.match(app, /function wireLineup\(\)\{document\.querySelectorAll\('\[data-collapse\]'\)/);
});

test('Event and Artist mutation actions are disabled but their views remain present', () => {
  for (const id of ['newEventBtn', 'duplicateEventBtn', 'deleteEventBtn', 'addSectionBtn', 'saveDraftBtn']) assert.match(ui, new RegExp(`['\"]${id}['\"]`));
  for (const id of ['newArtistBtn', 'collectArtistsBtn', 'deleteArtistBtn', 'saveArtistBtn', 'saveArtistsGitBtn']) assert.match(ui, new RegExp(`['\"]${id}['\"]`));
  assert.match(html, /id="view-artists"/);
  assert.match(ui, /Artist- und Lineup-Daten werden über FileMaker gepflegt/);
});

test('readEventForm implementations can only copy imageUrl into Event state', () => {
  const appReader = /function readEventForm\(\)\{([^}]*)\}/.exec(app)?.[1] || '';
  const textareaReader = /function safeReadEventForm\(\)\{([\s\S]*?)\n  \}/.exec(textareas)?.[1] || '';
  assert.match(appReader, /imageUrl/);
  assert.doesNotMatch(appReader, /\.date|\.title|\.color|\.moreUrl|\.description|\.sections/);
  assert.match(textareaReader, /imageUrl/);
  assert.doesNotMatch(textareaReader, /\.date|\.title|\.color|\.moreUrl|\.description|\.sections/);
});

test('only Event image textarea interaction marks Event dirty', () => {
  assert.match(textareas, /if\(textarea\.id==='evImageUrl'\)\{readEventForm\(\);markDirty\(\)/);
  assert.match(textareas, /textarea\.closest\('#view-artists'\)\)\{\s*return;/);
  assert.match(meta, /if\(id!=='evImageUrl'\)return/);
});

test('Event CSV import is disabled in UI and programmatic draft import fails closed', () => {
  assert.match(csv, /Eventimport erfolgt aktuell über FileMaker/);
  assert.match(csv, /\['csvImportExample','csvImportFile','csvImportText','csvImportCheck','csvImportApply'\]/);
  const require = createRequire(import.meta.url);
  const api = require('../public/admin/js/events-csv-import.js');
  assert.throws(() => api.importIntoDraft({ errors: [], events: [{ id: 'x' }] }, {}), /Eventimport erfolgt aktuell über FileMaker/);
});

test('full Event document save is absent from active Event save path', () => {
  const savePath = autoLoad.slice(autoLoad.indexOf('async function saveEventsStay()'), autoLoad.indexOf('async function saveResidentsStay()'));
  assert.match(savePath, /saveEventImageOnly/);
  assert.match(savePath, /loadMonthlyEvents\(\{strict:true,includeSitemap:true\}\)/);
  assert.match(savePath, /eventImageTargetId\(selected\)/);
  assert.doesNotMatch(savePath, /safeReadEvents|saveMonthlyEventDocument|eventsJson\(\)|readArtistForm/);
});

test('Resident editor controls and save routing remain outside image-only UI restrictions', () => {
  for (const id of ['resName', 'resCity', 'resGenre', 'resBio', 'saveResidentsGitBtn']) assert.match(html, new RegExp(`id="${id}"`));
  for (const id of ['resName', 'resCity', 'resGenre', 'resBio', 'saveResidentsGitBtn']) assert.doesNotMatch(ui, new RegExp(`['\"]${id}['\"]`));
  assert.match(autoLoad, /state\.view==='residents'\|\|state\.view==='releases'\?saveResidentsStay\(\)/);
});

test('legacy Data-URL file input is disabled and safe GitHub image dropzone remains enabled', () => {
  assert.match(ui, /disable\('evImageFile'/);
  assert.match(meta, /helper\.makeDropzone\('eventImageGithubDrop'/);
  assert.doesNotMatch(meta, /eventImageGithubDrop[^\n]+disabled=true/);
});
