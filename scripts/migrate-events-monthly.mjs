import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { effectiveEventId, eventSearchHaystack, reconstructEventDocument, storageArtifacts } from '../public/site/js/event-storage-model.js';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceArgument = process.argv[2] || 'public/events/data/events.json';
const sourcePath = resolve(repositoryRoot, sourceArgument);
const original = JSON.parse(await readFile(sourcePath, 'utf8'));
const { storage, files } = storageArtifacts(original);
const reconstructed = reconstructEventDocument(storage);

assert.deepEqual(reconstructed, original);
assert.deepEqual(reconstructed.events.map(effectiveEventId), original.events.map(effectiveEventId));
assert.deepEqual(reconstructed.events.map(eventSearchHaystack), original.events.map(eventSearchHaystack));

for (const [relativePath, content] of files) {
  const target = resolve(repositoryRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
}

console.log(JSON.stringify({
  source: sourceArgument.replaceAll('\\', '/'),
  originalEvents: original.events.length,
  reconstructedEvents: reconstructed.events.length,
  difference: reconstructed.events.length - original.events.length,
  months: storage.manifest.months.length,
  firstMonth: storage.manifest.months[0]?.key || '',
  lastMonth: storage.manifest.months.at(-1)?.key || '',
  generatedFiles: files.size,
  metaArtistsOld: original.meta?.artists?.length || 0,
  metaArtistsNew: reconstructed.meta?.artists?.length || 0,
  deepEqualityFailures: 0,
  searchEquivalenceFailures: 0
}, null, 2));
