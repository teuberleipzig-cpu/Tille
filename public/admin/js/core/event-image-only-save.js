import { effectiveEventId, storageArtifacts } from '../../../site/js/event-storage-model.js';
import { eventOutputPath, renderEventHtml, updateEventSitemap } from '../../../../scripts/events/event-seo.mjs';

const DATA_ROOT = 'public/events/data/';
const SITEMAP_PATH = 'sitemap.xml';

export function eventImageTargetId(event) { return effectiveEventId(event); }

export function normalizeEventImageUrl(value) {
  const imageUrl = String(value || '').trim();
  if (!imageUrl) return '';
  if (/^(?:data|blob|javascript):/i.test(imageUrl)) throw new Error('Eventbild darf keine data:-, blob:- oder javascript:-URL verwenden.');
  if (imageUrl.startsWith('public/events/media/')) {
    if (imageUrl.includes('..') || imageUrl.includes('\\') || !/^public\/events\/media\/[A-Za-z0-9._/-]+$/.test(imageUrl)) {
      throw new Error('Eventbild enthält einen unsicheren Medienpfad.');
    }
    return imageUrl;
  }
  let url;
  try { url = new URL(imageUrl); } catch (_) { throw new Error('Eventbild muss leer, ein sicherer Medienpfad oder eine HTTP/HTTPS-URL sein.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Eventbild muss HTTP oder HTTPS verwenden.');
  if (url.username || url.password) throw new Error('Eventbild-URL darf keine Zugangsdaten enthalten.');
  return imageUrl;
}

function findFreshEvent(document, targetEventId) {
  if (!document || !Array.isArray(document.events)) throw new Error('Frischer Event-Stand ist ungültig.');
  const id = String(targetEventId || '').trim();
  if (!id) throw new Error('Event-ID fehlt. Bitte Event neu laden.');
  const matches = document.events.filter(event => effectiveEventId(event) === id);
  if (matches.length !== 1) throw new Error('Event wurde inzwischen entfernt oder geändert. Bitte neu laden.');
  return { id, index: document.events.indexOf(matches[0]) };
}

export function patchFreshEventImage(document, targetEventId, requestedImageUrl) {
  const target = findFreshEvent(document, targetEventId);
  const patchedDocument = structuredClone(document);
  patchedDocument.events[target.index].imageUrl = normalizeEventImageUrl(requestedImageUrl);
  return { document: patchedDocument, event: patchedDocument.events[target.index], eventId: target.id, eventIndex: target.index };
}

function previousStoragePaths(manifest) {
  return [
    manifest?.metaPath,
    manifest?.eventIndexPath,
    manifest?.searchIndexPath,
    ...(manifest?.months || []).map(month => month.path)
  ].filter(Boolean);
}

function assertImageOnlyOutputPaths(files, eventId) {
  const page = eventOutputPath(eventId);
  for (const path of files.keys()) {
    if (path.startsWith(DATA_ROOT) || path === page || path === SITEMAP_PATH) continue;
    throw new Error(`Eventbild-Save darf Pfad nicht ändern: ${path}`);
  }
}

export function buildEventImageOnlySavePlan({ freshDocument, freshManifest, currentSitemap, targetEventId, requestedImageUrl }) {
  const patched = patchFreshEventImage(freshDocument, targetEventId, requestedImageUrl);
  const generated = storageArtifacts(patched.document);
  const files = new Map(generated.files);
  const page = eventOutputPath(patched.eventId);
  files.set(page, renderEventHtml(patched.event));
  let sitemapChanged = false;
  if (typeof currentSitemap === 'string') {
    const nextSitemap = updateEventSitemap(currentSitemap, patched.document.events);
    sitemapChanged = nextSitemap !== currentSitemap;
    if (sitemapChanged) files.set(SITEMAP_PATH, nextSitemap);
  }
  assertImageOnlyOutputPaths(files, patched.eventId);
  return {
    ...patched,
    files,
    manifest: generated.storage.manifest,
    previousPaths: previousStoragePaths(freshManifest),
    eventPage: page,
    sitemapChanged
  };
}

export async function saveEventImageOnly({ loadFresh, writer, targetEventId, requestedImageUrl }) {
  if (typeof loadFresh !== 'function' || !writer || typeof writer.commitFiles !== 'function') throw new Error('Eventbild-Save ist nicht vollständig initialisiert.');
  const fresh = await loadFresh();
  if (!fresh?.head) throw new Error('Frischer GitHub-HEAD für Eventbild-Save fehlt.');
  const plan = buildEventImageOnlySavePlan({
    freshDocument: fresh.document,
    freshManifest: fresh.manifest,
    currentSitemap: fresh.sitemap,
    targetEventId,
    requestedImageUrl
  });
  const result = await writer.commitFiles({
    files: plan.files,
    previousPaths: plan.previousPaths,
    expectedHead: fresh.head,
    message: 'Update event image from admin v2'
  });
  return { ...plan, ...result };
}
