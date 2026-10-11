import { PAGE_PATHS, assertPagesScope } from './contract.mjs';
import { assertNewsOutputContentSafe } from '../news/news-sync.mjs';

export function renderPage(file, template, page) {
  assertPagesScope([file]);
  const name = file.slice(0, -5).toUpperCase();
  const start = `<!-- TILLE:WORDPRESS:${name}:START -->`, end = `<!-- TILLE:WORDPRESS:${name}:END -->`;
  if (typeof template !== 'string' || template.split(start).length !== 2 || template.split(end).length !== 2 ||
      template.indexOf(start) >= template.indexOf(end)) throw new Error('Template must contain exactly one ordered Pages marker pair.');
  const before = template.slice(0, template.indexOf(start) + start.length);
  const after = template.slice(template.indexOf(end));
  if (!page?.contentHtml || /<\s*\/?\s*h1\b/i.test(page.contentHtml) || /TILLE:WORDPRESS:/i.test(page.contentHtml)) {
    throw new Error('Invalid Pages fragment or marker collision.');
  }
  const html = before + '\n' + page.contentHtml + '\n        ' + after;
  if ((html.match(/<h1\b/gi) || []).length !== 1 || !/<h1\b[^>]*>[^<]+<\/h1>/.test(before)) {
    throw new Error('Code-owned H1 must be outside and before the managed block.');
  }
  assertNewsOutputContentSafe(new Map([[file, html]]));
  return html;
}
export function generatePages(templates, pages) {
  if (!(templates instanceof Map) || !(pages instanceof Map) || templates.size !== 2 || pages.size !== 2) {
    throw new Error('Both Pages templates and models are required.');
  }
  assertPagesScope([...templates.keys()]); assertPagesScope([...pages.keys()]);
  return new Map(PAGE_PATHS.map(file => [file, renderPage(file, templates.get(file), pages.get(file))]));
}
