import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const galleryHtml = await readFile(new URL('gallery.html', root), 'utf8');
const galleryCss = await readFile(new URL('assets/gallery.css', root), 'utf8');
const feedback = await readFile(new URL('feedback.html', root), 'utf8');
const about = await readFile(new URL('about.html', root), 'utf8');
const history = await readFile(new URL('history.html', root), 'utf8');

test('Gallery heading uses the compact public heading contract', () => {
  assert.match(galleryCss, /\.gallery-content h1\{[^}]*display:block;[^}]*width:max-content;[^}]*max-width:100%;[^}]*background:#000;[^}]*color:#fff;[^}]*font-weight:900/);
  assert.match(galleryHtml, /gallery\.css\?v=gallery-4/);
  assert.doesNotMatch(galleryHtml, /gallery\.css\?v=gallery-3/);
});

test('Feedback has one labelled public H1 without changing its form contract', () => {
  assert.equal((feedback.match(/<h1\b/g) || []).length, 1);
  assert.match(feedback, /<section class="feedback-content" aria-labelledby="feedback-title">\s*<h1 id="feedback-title">Feedback<\/h1>/);
  assert.match(feedback, /\.feedback-content h1\{[^}]*display:block;[^}]*width:max-content;[^}]*background:#000;[^}]*color:#fff/);
  for (const id of ['feedback-category', 'feedback-message', 'reply-email']) assert.match(feedback, new RegExp(`id="${id}"`));
  assert.match(feedback, /action="https:\/\/formsubmit\.co\//);
});

test('About uses the requested H1 and keeps Club below it as H2', () => {
  assert.match(about, /<h1 id="about-title">About<\/h1>\s*<h2>Club<\/h2>/);
  assert.doesNotMatch(about, /<h1[^>]*>About Distillery<\/h1>/);
  assert.match(about, /\.about-content h1\{display:block;width:max-content;max-width:100%\}/);
});

test('History keeps Origins below its block-level H1', () => {
  assert.match(history, /<h1 id="history-title">History<\/h1>\s*<h2>Origins<\/h2>/);
  assert.match(history, /\.history-content h1\{display:block;width:max-content;max-width:100%\}/);
});

test('heading fix introduces no unsafe runtime primitives or URL schemes', () => {
  const changed = `${galleryCss}\n${feedback}\n${about}\n${history}`;
  assert.doesNotMatch(changed, /MutationObserver|setInterval\s*\(/);
  assert.doesNotMatch(changed, /(?:src|href)=["'](?:data|blob):/i);
});
