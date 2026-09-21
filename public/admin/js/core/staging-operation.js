import { settings, sha, repoPath, assertScope } from './staging-contract.js?v=admin-staging-1';
import { createAtomicGitHubCommit } from './github-atomic-commit.js?v=admin-staging-1';

const API = 'https://api.github.com/repos/teuberleipzig-cpu/Tille';
const decode = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), c => c.charCodeAt(0)));

export function createStagingOperation(input, { scope, subject, fetch: requestFetch = globalThis.fetch } = {}) {
  const config = settings(input); // Capture before the first await; never read the DOM here.
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (config.token) headers.Authorization = `Bearer ${config.token}`;
  let context, bindingPromise;
  let lastResult = null;
  async function request(endpoint, options = {}) {
    const response = await requestFetch(API + endpoint, { cache: 'no-store', ...options, headers: { ...headers, ...options.headers } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`GitHub ${response.status}: Staging-Vorgang fehlgeschlagen. Bitte Rechte prüfen oder neu laden.`);
      error.status = response.status; throw error;
    }
    return payload;
  }
  const head = async ref => sha((await request('/git/ref/heads/' + encodeURIComponent(ref))).object?.sha);
  async function bind() {
    if (!bindingPromise) bindingPromise = Promise.all([head('main'), head(config.contentRef)]).then(([codeSha, contentSha]) => {
      context = Object.freeze({ ...config, codeSha, contentSha }); return context;
    });
    await bindingPromise;
    return context;
  }
  async function assertFresh() {
    await bind();
    if (await head(config.contentRef) !== context.contentSha) throw new Error('Konflikt: Staging wurde verändert. Bitte neu laden.');
  }
  async function getFile(file) {
    repoPath(file); await bind();
    return request('/contents/' + file.split('/').map(encodeURIComponent).join('/') + '?ref=' + context.contentSha);
  }
  async function getTextFile(file) {
    const meta = await getFile(file);
    const blob = meta.content ? meta : await request('/git/blobs/' + sha(meta.sha));
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new Error('GitHub-Datei enthält keinen lesbaren Inhalt.');
    return { text: decode(blob.content), sha: sha(meta.sha), path: file };
  }
  async function commitFiles({ files, previousPaths = [], message, expectedHead }) {
    await bind();
    if (!config.token) throw new Error('GitHub Token fehlt.');
    if (expectedHead !== context.contentSha) throw new Error('Gebundener Content-SHA stimmt nicht überein. Bitte neu laden.');
    assertScope(scope, subject, [...files.keys(), ...previousPaths]);
    await assertFresh();
    const writer = createAtomicGitHubCommit({ ...config, branch: config.contentRef, fetch: requestFetch, requireParent: true });
    const result = await writer.commitFiles({ files, previousPaths, message, expectedHead });
    context = Object.freeze({ ...context, contentSha: sha(result.commit) });
    lastResult = result;
    try { await assertFresh(); }
    catch { throw Object.assign(new Error('Content gespeichert, aber Staging wurde danach verändert. Kein Deployment. Bitte neu laden.'), { contentSaved: true, commit: result.commit }); }
    return result;
  }
  async function put(file, value, expectedBlobSha, message) {
    assertScope(scope, subject, [file]);
    let existing;
    try { existing = await getFile(file); }
    catch (error) { if (error.status !== 404) throw error; }
    if ((existing?.sha || '') !== (expectedBlobSha || '')) throw new Error('Dateikonflikt in Staging. Bitte neu laden.');
    const result = await commitFiles({ files: new Map([[file, value]]), message, expectedHead: (await bind()).contentSha });
    let saved;
    try { saved = await getFile(file); }
    catch { throw Object.assign(new Error('Content gespeichert; Dateibestätigung fehlgeschlagen. Bitte neu laden, nicht erneut speichern.'), { contentSaved: true, commit: result.commit }); }
    return { content: { sha: saved.sha }, commit: { sha: result.commit } };
  }
  async function deleteFile(file, expectedBlobSha, message) {
    assertScope(scope, subject, [file]);
    if ((await getFile(file)).sha !== expectedBlobSha) throw new Error('Medienkonflikt in Staging. Bitte neu laden.');
    return commitFiles({ files: new Map(), previousPaths: [file], message, expectedHead: (await bind()).contentSha });
  }
  async function finish({ dispatch = false } = {}) {
    await bind();
    if (!lastResult?.changed) return { status: 'unchanged', message: 'Keine Contentänderung.' };
    try {
      await assertFresh();
      const codeSha = await head('main');
      const inputs = Object.freeze({ expected_sha: codeSha, expected_content_sha: context.contentSha });
      if (!dispatch) return { status: 'saved', inputs, message: 'Content gespeichert. Deployment nicht angefordert.' };
      await request('/actions/workflows/docker-publish.yml/dispatches', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main', inputs }) });
      return { status: 'dispatched', inputs, message: 'Content gespeichert, Staging-Deployment angefordert.' };
    } catch { return { status: 'deploy-failed', message: 'Content gespeichert, Staging-Deployment konnte nicht gestartet werden. Bitte Rechte und Revisionen prüfen.' }; }
  }
  return Object.freeze({ bind, assertFresh, getFile, getTextFile, commitFiles, deleteFile, finish,
    putTextFile: (file, text, expected, message) => put(file, text, expected, message),
    putBase64File: (file, base64, expected, message) => put(file, { base64 }, expected, message) });
}
