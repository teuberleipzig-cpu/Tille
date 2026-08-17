import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { reconstructEventDocument, storageArtifacts } from '../../public/site/js/event-storage-model.js';
import { applyFileMakerOperation, parseFileMakerEventJson } from './filemaker-event-model.mjs';

export const FILEMAKER_BRANCH_PREFIX = 'automation/filemaker-event/';
const DATA_ROOT = 'public/events/data';

export function fileMakerBranch(eventId) { return `${FILEMAKER_BRANCH_PREFIX}${eventId}`; }

export function isAllowedEventOutputPath(file) {
  const value = String(file || '').replaceAll('\\', '/');
  return [
    `${DATA_ROOT}/manifest.json`, `${DATA_ROOT}/meta.json`, `${DATA_ROOT}/event-index.json`, `${DATA_ROOT}/search-index.json`
  ].includes(value) || /^public\/events\/data\/months\/\d{4}-(?:0[1-9]|1[0-2])\.json$/.test(value);
}

export function assertAllowedEventOutputPaths(files) {
  for (const file of files) if (!isAllowedEventOutputPath(file)) throw new Error(`FileMaker output path is not allowed: ${file}`);
}

export async function loadEventDocumentFromWorkspace(root) {
  const readJson = relative => readFile(path.join(root, relative), 'utf8').then(JSON.parse);
  const manifest = await readJson(`${DATA_ROOT}/manifest.json`);
  const [metadata, eventIndex, ...months] = await Promise.all([
    readJson(manifest.metaPath), readJson(manifest.eventIndexPath), ...manifest.months.map(month => readJson(month.path))
  ]);
  return reconstructEventDocument({ manifest, metadata, eventIndex, months: new Map(manifest.months.map((month, index) => [month.key, months[index]])) });
}

async function currentStorageFiles(root) {
  const files = new Map();
  for (const name of ['manifest.json', 'meta.json', 'event-index.json', 'search-index.json']) {
    const relative = `${DATA_ROOT}/${name}`;
    files.set(relative, await readFile(path.join(root, relative), 'utf8'));
  }
  const monthRoot = path.join(root, DATA_ROOT, 'months');
  for (const item of await readdir(monthRoot, { withFileTypes: true })) {
    if (!item.isFile()) throw new Error(`Unsupported event storage entry: ${item.name}`);
    const relative = `${DATA_ROOT}/months/${item.name}`;
    files.set(relative, await readFile(path.join(root, relative), 'utf8'));
  }
  assertAllowedEventOutputPaths(files.keys());
  return files;
}

export function diffEventStorage(current, generated) {
  assertAllowedEventOutputPaths([...current.keys(), ...generated.keys()]);
  const comparable = value => typeof value === 'string' ? value.replaceAll('\r\n', '\n') : value;
  const changedFiles = [...new Set([...current.keys(), ...generated.keys()])]
    .filter(file => comparable(current.get(file)) !== comparable(generated.get(file))).sort();
  return { hasChanges: changedFiles.length > 0, changedFiles };
}

export function planFileMakerPullRequest({ mode, hasChanges, eventId, openPullRequests = [], baseMoved = false }) {
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
  if (mode === 'validate-only') return { action: 'none', write: false };
  if (baseMoved) throw new Error('main moved during FileMaker intake; rerun required.');
  const relevant = openPullRequests.filter(pr => pr.base === 'main' && String(pr.head || '').startsWith(FILEMAKER_BRANCH_PREFIX));
  if (relevant.length > 1) throw new Error('More than one FileMaker event intake PR is open. Close duplicates before rerunning.');
  const branch = fileMakerBranch(eventId);
  const same = relevant.find(pr => pr.head === branch);
  const other = relevant.find(pr => pr.head !== branch);
  if (other) throw new Error(`Another FileMaker event intake PR is already open: PR #${other.number} for ${other.head.slice(FILEMAKER_BRANCH_PREFIX.length)}. Merge or close it before sending another FileMaker event.`);
  if (!hasChanges) return same ? { action: 'close-pr', write: true, branch, base: 'main', prNumber: same.number } : { action: 'none', write: false };
  return { action: same ? 'update-pr' : 'create-pr', write: true, branch, base: 'main', draft: true, prNumber: same?.number || null };
}

export async function applyEventStorage(root, previousFiles, nextFiles) {
  assertAllowedEventOutputPaths([...previousFiles.keys(), ...nextFiles.keys()]);
  for (const file of previousFiles.keys()) if (!nextFiles.has(file)) await rm(path.join(root, file), { force: true });
  for (const [file, content] of nextFiles) {
    if (previousFiles.has(file) && previousFiles.get(file).replaceAll('\r\n', '\n') === content.replaceAll('\r\n', '\n')) continue;
    const destination = path.join(root, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, 'utf8');
  }
}

export async function prepareFileMakerEvent({ mode, operation, eventJson, workspaceRoot }) {
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
  const input = parseFileMakerEventJson(eventJson, operation);
  const currentDocument = await loadEventDocumentFromWorkspace(workspaceRoot);
  const result = applyFileMakerOperation(currentDocument, operation, input);
  const previousFiles = await currentStorageFiles(workspaceRoot);
  const generated = storageArtifacts(result.document);
  const reconstructed = reconstructEventDocument(generated.storage);
  if (JSON.stringify(reconstructed) !== JSON.stringify(result.document)) throw new Error('Generated Event Storage failed reconstruction validation.');
  const diff = diffEventStorage(previousFiles, generated.files);
  if (mode === 'sync-pr' && diff.hasChanges) await applyEventStorage(workspaceRoot, previousFiles, generated.files);
  return {
    ...result, ...diff, eventId: input.id, operation,
    branch: fileMakerBranch(input.id), changedFilesCount: diff.changedFiles.length,
    title: result.document.events.find(event => event.id === input.id)?.title || '',
    date: result.document.events.find(event => event.id === input.id)?.date || input.date || ''
  };
}
