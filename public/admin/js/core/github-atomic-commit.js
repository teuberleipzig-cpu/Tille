function utf8Base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index, index + 32768));
  return btoa(binary);
}

async function gitBlobSha(text) {
  const content = new TextEncoder().encode(text);
  const header = new TextEncoder().encode(`blob ${content.length}\0`);
  const bytes = new Uint8Array(header.length + content.length);
  bytes.set(header);
  bytes.set(content, header.length);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

export function createAtomicGitHubCommit(config) {
  const owner = String(config.owner || '').trim();
  const repo = String(config.repo || '').trim();
  const branch = String(config.branch || '').trim();
  const token = String(config.token || '').trim();
  const requestFetch = config.fetch || fetch;
  if (!owner || !repo || !branch) throw new Error('GitHub Owner, Repo und Branch müssen angegeben werden.');
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (token) headers.Authorization = `Bearer ${token}`;

  async function request(path, options = {}) {
    const response = await requestFetch(base + path, { cache: 'no-store', ...options, headers: { ...headers, ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || `GitHub request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  const refPath = `/git/ref/heads/${encodeURIComponent(branch)}`;
  const refsPath = `/git/refs/heads/${encodeURIComponent(branch)}`;
  const readHead = async () => (await request(refPath)).object.sha;

  async function commitFiles({ files, previousPaths = [], message, expectedHead }) {
    if (!token) throw new Error('GitHub Token fehlt für atomaren Event-Save.');
    const head = await readHead();
    if (expectedHead && head !== expectedHead) throw new Error('Events-Konflikt: Branch wurde seit dem Laden verändert. Bitte neu laden.');
    const parent = await request(`/git/commits/${encodeURIComponent(head)}`);
    const tree = await request(`/git/trees/${encodeURIComponent(parent.tree.sha)}?recursive=1`);
    const current = new Map((tree.tree || []).filter(item => item.type === 'blob').map(item => [item.path, item.sha]));
    const entries = [];
    for (const [path, content] of files) {
      const expectedSha = await gitBlobSha(content);
      if (current.get(path) === expectedSha) continue;
      const blob = await request('/git/blobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: utf8Base64(content), encoding: 'base64' }) });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of previousPaths) if (!files.has(path) && current.has(path)) entries.push({ path, mode: '100644', type: 'blob', sha: null });
    if (!entries.length) return { head, commit: head, changed: false };
    const nextTree = await request('/git/trees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base_tree: parent.tree.sha, tree: entries }) });
    const commit = await request('/git/commits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, tree: nextTree.sha, parents: [head] }) });
    if (await readHead() !== head) throw new Error('Events-Konflikt: Branch änderte sich während des Speicherns. Bitte neu laden.');
    await request(refsPath, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha: commit.sha, force: false }) });
    return { head, commit: commit.sha, changed: true };
  }

  return { readHead, commitFiles };
}
