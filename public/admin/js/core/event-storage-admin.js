import { reconstructEventDocument, storageArtifacts } from '../../../site/js/event-storage-model.js?v=event-storage-model-1';

export const EVENT_MANIFEST_PATH = 'public/events/data/manifest.json';

export async function loadMonthlyEventDocument(readJson, manifestPath = EVENT_MANIFEST_PATH) {
  const manifest = await readJson(manifestPath);
  if (!manifest || !Array.isArray(manifest.months)) throw new Error('Event-Manifest ist ungültig.');
  const [metadata, eventIndex, ...monthDocuments] = await Promise.all([
    readJson(manifest.metaPath),
    readJson(manifest.eventIndexPath),
    ...manifest.months.map(month => readJson(month.path))
  ]);
  const months = new Map(manifest.months.map((month, index) => [month.key, monthDocuments[index]]));
  return reconstructEventDocument({ manifest, metadata, eventIndex, months });
}

export function buildMonthlyEventFiles(document) {
  return storageArtifacts(document);
}

export async function saveMonthlyEventDocument({ document, writer, expectedHead, previousManifest }) {
  const { storage, files } = buildMonthlyEventFiles(document);
  const previousPaths = [
    EVENT_MANIFEST_PATH,
    previousManifest?.metaPath,
    previousManifest?.eventIndexPath,
    previousManifest?.searchIndexPath,
    ...(previousManifest?.months || []).map(month => month.path)
  ].filter(Boolean);
  const result = await writer.commitFiles({ files, previousPaths, expectedHead, message: 'Update monthly events data from admin v2' });
  return { ...result, manifest: storage.manifest };
}
