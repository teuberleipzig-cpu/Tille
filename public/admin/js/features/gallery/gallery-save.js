import { isGalleryMediaPath, removeGalleryImage } from '../../../../gallery/js/gallery-model.js';

export function stageGalleryImageDelete(playlist, image, pendingMediaDeletes) {
  if (!isGalleryMediaPath(image?.url)) throw new Error('Löschen blockiert: Bild liegt nicht unter public/gallery/media/.');
  pendingMediaDeletes.add(image.url);
  return removeGalleryImage(playlist, image.id);
}

export async function cleanupGalleryMedia(client, pendingMediaDeletes) {
  const failures = [];
  for (const path of [...pendingMediaDeletes]) {
    if (!isGalleryMediaPath(path)) { failures.push({ path, error: new Error('Ungültiger Gallery-Medienpfad.') }); continue; }
    try {
      const file = await client.getFile(path);
      await client.deleteFile(path, file.sha, 'Delete gallery image after data save');
      pendingMediaDeletes.delete(path);
    } catch (error) {
      if (error?.status === 404) pendingMediaDeletes.delete(path);
      else failures.push({ path, error });
    }
  }
  return failures;
}

export async function saveGalleryData({ client, dataPath, next, loadedSha, pendingMediaDeletes }) {
  const fresh = await client.getTextFile(dataPath);
  if (!loadedSha || fresh.sha !== loadedSha) throw new Error('Gallery wurde zwischenzeitlich geändert. Bitte neu laden.');
  const result = await client.putTextFile(dataPath, JSON.stringify(next, null, 2) + '\n', fresh.sha, 'Update gallery from admin v2');
  const cleanupFailures = await cleanupGalleryMedia(client, pendingMediaDeletes);
  return { loadedSha: result.content?.sha || '', cleanupFailures };
}
