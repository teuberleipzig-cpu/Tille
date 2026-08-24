import { mkdir, readFile, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeResidentId, RESIDENT_OUTPUT_ROOT, residentSeoArtifacts } from './resident-seo.mjs';

export async function loadResidentDocument(root) {
  return JSON.parse(await readFile(path.join(root, 'public/residents/data/residents.json'), 'utf8'));
}

export async function readGeneratedResidentPages(root) {
  const outputRoot = path.join(root, RESIDENT_OUTPUT_ROOT);
  let entries;
  try { entries = await readdir(outputRoot, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return new Map(); throw error; }
  const files = new Map();
  for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    const id = assertSafeResidentId(entry.name);
    if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error(`Unerwarteter Resident-Output: ${RESIDENT_OUTPUT_ROOT}/${id}`);
    const children = await readdir(path.join(outputRoot, id), { withFileTypes: true });
    if (children.length !== 1 || children[0].name !== 'index.html' || !children[0].isFile() || children[0].isSymbolicLink()) {
      throw new Error(`Unerwarteter Resident-Output in ${RESIDENT_OUTPUT_ROOT}/${id}.`);
    }
    const relative = `${RESIDENT_OUTPUT_ROOT}/${id}/index.html`;
    files.set(relative, await readFile(path.join(root, relative), 'utf8'));
  }
  return files;
}

export async function prepareResidentSeo({ workspaceRoot = process.cwd(), expectedCount, write = true } = {}) {
  const document = await loadResidentDocument(workspaceRoot);
  const sitemapPath = path.join(workspaceRoot, 'sitemap.xml');
  const existingSitemap = await readFile(sitemapPath, 'utf8');
  const generated = residentSeoArtifacts(document, existingSitemap);
  if (expectedCount != null && generated.publicResidents.length !== expectedCount) {
    throw new Error(`Erwartet wurden ${expectedCount} öffentliche Residents, gefunden wurden ${generated.publicResidents.length}.`);
  }
  const existingPages = await readGeneratedResidentPages(workspaceRoot);
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
    publicResidentCount: generated.publicResidents.length,
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
  const summary = await prepareResidentSeo(options);
  if (!options.write && summary.hasChanges) throw new Error(`Resident SEO output is not current: ${summary.changedFilesCount} Datei(en) würden geändert.`);
  console.log(`Resident SEO ${summary.hasChanges ? 'updated' : 'NO CHANGE'}: residents=${summary.publicResidentCount}, pages=${summary.expectedPageCount}, changed=${summary.changedPages.length}, removed=${summary.stalePages.length}, sitemap=${summary.sitemapChanged ? 'changed' : 'unchanged'}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
