export const RESIDENTS_PATH = 'public/residents/data/residents.json';
export const CONFLICT = 'Staging wurde verändert. Bitte neu laden.';
export function fullSha(value) {
  if (!/^[a-f0-9]{40}$/.test(value || '')) throw new Error('GitHub lieferte keinen vollständigen Commit-/Blob-SHA.');
  return value;
}
export const encodeText = text => btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''));
export const decodeText = text => new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(text.replace(/\s/g, '')), c => c.charCodeAt(0)));
const pathUrl = path => path.split('/').map(encodeURIComponent).join('/');
function createRequester(token, fetcher) {
  if (!token?.trim()) throw new Error('GitHub-Token-Feld ist leer.');
  return async function request(path, method = 'GET', body, missing = false) {
    let response;
    try {
      response = await fetcher(`https://api.github.com/repos/teuberleipzig-cpu/Tille/${path}`, {
        method, cache: 'no-store', redirect: 'error',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch { throw new Error('GitHub-Netzwerkfehler. Bitte Zustand prüfen und neu laden; kein automatischer Retry.'); }
    if (missing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} fehlgeschlagen (HTTP ${response.status}). Bitte Rechte/Zustand prüfen und neu laden.`);
    return response.status === 204 ? null : response.json();
  };
}
export function createTransport(token, fetcher = globalThis.fetch) {
  const request = createRequester(token, fetcher);
  async function head(ref) {
    if (!['main', 'content/staging'].includes(ref)) throw new Error('Unzulässiger Ref.');
    return fullSha((await request(`git/ref/heads/${pathUrl(ref)}`)).object?.sha);
  }
  async function check(parent) {
    if (await head('content/staging') !== fullSha(parent)) throw new Error(CONFLICT);
  }
  async function file(path, sha, missing = false) {
    const meta = await request(`contents/${pathUrl(path)}?ref=${fullSha(sha)}`, 'GET', undefined, missing);
    if (!meta) return null;
    if (meta.type !== 'file') throw new Error('GitHub-Pfad ist keine reguläre Datei.');
    fullSha(meta.sha);
    return meta;
  }
  async function residents(sha) {
    const meta = await file(RESIDENTS_PATH, sha);
    const blob = meta.content ? meta : await request(`git/blobs/${fullSha(meta.sha)}`);
    return JSON.parse(decodeText(blob.content || ''));
  }
  async function commit(parent, path, content, message) {
    await check(parent);
    const base = await request(`git/commits/${fullSha(parent)}`);
    const old = await file(path, parent, true);
    if (content === null && !old) { await check(parent); return parent; }
    const blob = content === null ? null : await request('git/blobs', 'POST', { content, encoding: 'base64' });
    const tree = await request('git/trees', 'POST', { base_tree: fullSha(base.tree?.sha),
      tree: [{ path, mode: '100644', type: 'blob', sha: blob ? fullSha(blob.sha) : null }] });
    const next = await request('git/commits', 'POST', { message, tree: fullSha(tree.sha), parents: [parent] });
    const sha = fullSha(next.sha);
    await check(parent);
    try {
      await request('git/refs/heads/content/staging', 'PATCH', { sha, force: false });
      await check(sha);
    } catch (error) {
      throw new Error(`Content-Commit ${sha} wurde vorbereitet; Ref-Ergebnis nicht sicher bestätigt. Bitte neu laden. ${error.message}`);
    }
    return sha;
  }
  async function prepareDeployment(contentSha) {
    await check(contentSha);
    const codeSha = await head('main');
    await check(contentSha);
    return {
      ref: 'main', inputs: { expected_sha: codeSha, expected_content_sha: fullSha(contentSha) }
    };
  }
  async function deployment(contentSha) {
    const body = await prepareDeployment(contentSha);
    await request('actions/workflows/docker-publish.yml/dispatches', 'POST', body);
    return body.inputs;
  }
  return Object.freeze({ head, check, residents, commit, prepareDeployment, deployment });
}
