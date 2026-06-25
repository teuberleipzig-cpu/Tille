// Admin V2 GitHub Contents API client.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize GitHub API calls before existing sync/upload code is migrated.

export function createGitHubClient(config) {
  const owner = String(config?.owner || '').trim();
  const repo = String(config?.repo || '').trim();
  const branch = String(config?.branch || 'main').trim();
  const token = String(config?.token || '').trim();

  if (!owner) throw new Error('GitHub owner fehlt.');
  if (!repo) throw new Error('GitHub repo fehlt.');
  if (!branch) throw new Error('GitHub branch fehlt.');
  if (!token) throw new Error('GitHub token fehlt.');

  function apiPath(path) {
    return String(path || '').split('/').map(encodeURIComponent).join('/');
  }

  function url(path, query = '') {
    const suffix = query ? '?' + query : '';
    return 'https://api.github.com/repos/' + encodeURIComponent(owner) + '/' + encodeURIComponent(repo) + '/contents/' + apiPath(path) + suffix;
  }

  function headers(extra = {}) {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra
    };
  }

  async function request(requestUrl, options = {}) {
    const response = await fetch(requestUrl, {
      cache: 'no-store',
      ...options,
      headers: {
        ...headers(),
        ...(options.headers || {})
      }
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.message || 'GitHub request failed: ' + response.status;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function getFile(path) {
    const query = 'ref=' + encodeURIComponent(branch) + '&t=' + Date.now();
    return request(url(path, query));
  }

  async function getTextFile(path) {
    const file = await getFile(path);
    const content = String(file.content || '').replace(/\s/g, '');
    const text = decodeURIComponent(escape(atob(content)));
    return { text, sha: file.sha, path: file.path || path };
  }

  async function putTextFile(path, text, sha, message) {
    const body = {
      message: message || 'Update ' + path,
      content: btoa(unescape(encodeURIComponent(String(text || '')))),
      branch
    };
    if (sha) body.sha = sha;

    return request(url(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async function putBase64File(path, base64Content, sha, message) {
    const body = {
      message: message || 'Upload ' + path,
      content: String(base64Content || ''),
      branch
    };
    if (sha) body.sha = sha;

    return request(url(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  async function deleteFile(path, sha, message) {
    if (!sha) throw new Error('GitHub sha fehlt für Delete: ' + path);
    return request(url(path), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || 'Delete ' + path,
        sha,
        branch
      })
    });
  }

  return {
    owner,
    repo,
    branch,
    getFile,
    getTextFile,
    putTextFile,
    putBase64File,
    deleteFile
  };
}

export async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}
