import { readFile } from 'node:fs/promises';
import { normalizePage } from '../../scripts/wordpress-pages/page-model.mjs';
import { renderPage } from '../../scripts/wordpress-pages/page-render.mjs';

// Synthetic editorial content only; the existing GET-only harness keeps it in memory.
export async function wordpressPagesFixture(origin) {
  const files = new Map();
  for (const [name, id] of [['about', 11], ['history', 22]]) {
    const content = `<h2>P4 ${name} Fixture</h2><p>Redaktioneller Testinhalt mit <strong>Fettdruck</strong> und <em>Betonung</em>.</p>` +
      '<h3>Programm und Geschichte</h3><ul><li>Erster Listeneintrag</li><li>Zweiter Listeneintrag</li></ul>' +
      `<p><a href="https://example.org/">Sicherer redaktioneller Link</a></p><figure><img src="${origin}/assets/distillery-logo.svg" alt="P4 Inline-Bild"></figure>`;
    const model = normalizePage({ id, status: 'publish', title: { rendered: 'Fixture title, not H1' }, content: { rendered: content } }, id, 'https://cms.example');
    const template = await readFile(new URL(`../../${name}.html`, import.meta.url), 'utf8');
    files.set(`${name}.html`, renderPage(`${name}.html`, template, model));
  }
  return files;
}
