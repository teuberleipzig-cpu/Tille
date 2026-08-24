import { mkdir, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reconstructEventDocument } from '../../public/site/js/event-storage-model.js';
import { assertSafeEventId, EVENT_OUTPUT_ROOT, eventSeoArtifacts } from './event-seo.mjs';

async function readJson(root, relative) {
  return JSON.parse(await readFile(path.join(root, relative), 'utf8'));
}

export async function loadEventDocument(root) {
  const manifest = await readJson(root, 'public/events/data/manifest.json');
  const metadata = await readJson(root, manifest.metaPath);
  const eventIndex = await readJson(root, manifest.eventIndexPath);
  const searchIndex = await readJson(root, manifest.searchIndexPath);
  const months = new Map();
  for (const month of manifest.months) months.set(month.key, await readJson(root, month.path));
  return reconstructEventDocument({ manifest, metadata, eventIndex, searchIndex, months });
}

export async function readGeneratedEventPages(root) {
  const outputRoot = path.join(root, EVENT_OUTPUT_ROOT);
  let entries;
  try { entries = await readdir(outputRoot, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return new Map(); throw error; }
  const files = new Map();
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const id = assertSafeEventId(entry.name);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Unerwarteter Event-Output: ${EVENT_OUTPUT_ROOT}/${id}`);
    const children = await readdir(path.join(outputRoot, id), { withFileTypes: true });
    if (children.length !== 1 || children[0].name !== 'index.html' || !children[0].isFile() || children[0].isSymbolicLink()) {
      throw new Error(`Unerwarteter Event-Output in ${EVENT_OUTPUT_ROOT}/${id}.`);
    }
    const relative = `${EVENT_OUTPUT_ROOT}/${id}/index.html`;
    files.set(relative, await readFile(path.join(root, relative), 'utf8'));
  }
  return files;
}

export async function prepareEventSeo({ workspaceRoot = process.cwd(), expectedCount, write = true } = {}) {
  const document = await loadEventDocument(workspaceRoot);
  const sitemapPath = path.join(workspaceRoot, 'sitemap.xml');
  const existingSitemap = await readFile(sitemapPath, 'utf8');
  const generated = eventSeoArtifacts(document, existingSitemap);
  if (expectedCount != null && generated.publicEvents.length !== expectedCount) {
    throw new Error(`Erwartet wurden ${expectedCount} öffentliche Events, gefunden wurden ${generated.publicEvents.length}.`);
  }
  const existingPages = await readGeneratedEventPages(workspaceRoot);
  const expectedPages = new Map([...generated.files].filter(([file]) => file !== 'sitemap.xml'));
  const changedPages = [...expectedPages].filter(([file, content]) => existingPages.get(file) !== content).map(([file]) => file);
  const stalePages = [...existingPages.keys()].filter(file => !expectedPages.has(file));
  const nextSitemap = generated.files.get('sitemap.xml');
  const sitemapChanged = existingSitemap !== nextSitemap;

  if (write) {
    for (const file of stalePages) {
      await rm(path.join(workspaceRoot, file), { force: true });
      await rmdir(path.dirname(path.join(workspaceRoot, file)));
    }
    for (const file of changedPages) {
      const destination = path.join(workspaceRoot, file);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, expectedPages.get(file), 'utf8');
    }
    if (sitemapChanged) await writeFile(sitemapPath, nextSitemap, 'utf8');
  }

  return {
    publicEventCount: generated.publicEvents.length,
    expectedPageCount: expectedPages.size,
    changedPages,
    stalePages,
    sitemapChanged,
    changedFilesCount: changedPages.length + stalePages.length + Number(sitemapChanged),
    hasChanges: changedPages.length > 0 || stalePages.length > 0 || sitemapChanged
  };
}

function parseArguments(argv) {
  const options = { workspaceRoot: process.cwd(), write: true };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--workspace') options.workspaceRoot = argv[++index];
    else if (argv[index] === '--expected-count') options.expectedCount = Number(argv[++index]);
    else if (argv[index] === '--check') options.write = false;
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (options.expectedCount != null && (!Number.isInteger(options.expectedCount) || options.expectedCount < 0)) throw new Error('--expected-count muss eine nichtnegative Ganzzahl sein.');
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const summary = await prepareEventSeo(options);
  if (!options.write && summary.hasChanges) throw new Error(`Event SEO output is not current: ${summary.changedFilesCount} Datei(en) würden geändert.`);
  console.log(`Event SEO ${summary.hasChanges ? 'updated' : 'NO CHANGE'}: events=${summary.publicEventCount}, pages=${summary.expectedPageCount}, changed=${summary.changedPages.length}, removed=${summary.stalePages.length}, sitemap=${summary.sitemapChanged ? 'changed' : 'unchanged'}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
