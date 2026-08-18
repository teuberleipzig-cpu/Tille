import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const publicPages = [
  '404.html',
  'about.html',
  'contact.html',
  'datenschutz.html',
  'feedback-thanks.html',
  'feedback.html',
  'gallery.html',
  'history.html',
  'impressum.html',
  'index.html',
  'news.html',
  'news/index.html',
  'resident-releases.html',
  'residents.html',
];

test('public pages use the official Distillery SVG logo', async () => {
  for (const page of publicPages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.match(html, /<img src="assets\/distillery-logo\.svg" alt="Distillery">/);
    assert.doesNotMatch(html, /assets\/distillery-logo\.png/);
  }
});

test('official SVG logo pages cancel the legacy negative margin', async () => {
  for (const page of publicPages) {
    const html = await readFile(new URL(page, root), 'utf8');
    assert.doesNotMatch(html, /\.logo\{[^}]*margin(?:-left)?:\s*[^;}]*-\d+px/i);
    assert.match(html, /\.logo\{[^}]*margin(?:-left)?:\s*(?:0 0 8px )?0/i);
  }
});

test('official Distillery logo is a self-contained SVG', async () => {
  const logoUrl = new URL('assets/distillery-logo.svg', root);
  const [logo, metadata] = await Promise.all([
    readFile(logoUrl, 'utf8'),
    stat(logoUrl),
  ]);

  assert.ok(metadata.size > 0);
  const documentRoot = logo
    .replace(/^\s*<\?xml[^>]*>\s*/i, '')
    .replace(/^\s*<!--[\s\S]*?-->\s*/, '');
  assert.match(documentRoot, /^<svg\b/i);
  assert.match(logo, /<svg\b[^>]*\bviewBox\s*=\s*["'][^"']+["']/i);
  assert.doesNotMatch(logo, /<script\b/i);
  assert.doesNotMatch(logo, /javascript\s*:/i);
  assert.doesNotMatch(logo, /(?:href|xlink:href)\s*=\s*["']\s*(?:https?:)?\/\//i);
});
