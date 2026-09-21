import { portalSession } from './github.js?v=staging-writer-1';
export { slug } from './media-scope.js?v=staging-writer-1';
export async function uploadBlob(path, blob, _token) {
  const session = portalSession();
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return session.media(path, btoa(binary));
}
export async function deleteRepoFile(publicUrl, _token) {
  return portalSession().media(publicUrl, null);
}
