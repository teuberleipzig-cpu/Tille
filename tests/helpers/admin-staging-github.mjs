import { createHash } from 'node:crypto';

export const CODE = 'a'.repeat(40), CONTENT = 'b'.repeat(40), NEXT_CODE = 'c'.repeat(40);
export const config = () => ({ environment: 'staging', contentRef: 'content/staging', owner: 'teuberleipzig-cpu', repo: 'Tille', token: 'fixture-token' });
const hash = value => createHash('sha1').update(value).digest('hex');
const blobHash = bytes => hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]));

// In-memory Git Data API. No network fallback is possible.
export function githubMock(files = {}) {
  const calls = [], blobs = new Map(), trees = new Map(), commits = new Map();
  const initial = {};
  for (const [path, text] of Object.entries(files)) { const bytes = Buffer.from(text); const sha = blobHash(bytes); blobs.set(sha, bytes); initial[path] = sha; }
  const treeSha = hash(JSON.stringify(initial)); trees.set(treeSha, initial); commits.set(CONTENT, { tree: { sha: treeSha }, parents: [] });
  const mock = { calls, blobs, trees, commits, code: CODE, content: CONTENT, before: null, dispatchFailure: false, badParent: false };
  const result = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
  mock.fetch = async (url, options = {}) => {
    const path = url.replace('https://api.github.com/repos/teuberleipzig-cpu/Tille', '');
    const method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
    const call = { path, method, body, authorization: options.headers?.Authorization }; calls.push(call);
    const intercepted = mock.before?.(call, mock); if (intercepted) return intercepted;
    if (path === '/git/ref/heads/main') return result({ object: { sha: mock.code } });
    if (path === '/git/ref/heads/content%2Fstaging') return result({ object: { sha: mock.content } });
    if (path.startsWith('/contents/')) {
      const [file, query] = path.slice(10).split('?'); const ref = new URLSearchParams(query).get('ref');
      const commit = commits.get(ref), tree = trees.get(commit?.tree.sha), sha = tree?.[decodeURIComponent(file)];
      return sha ? result({ sha, encoding: 'base64', content: blobs.get(sha).toString('base64') }) : result({}, 404);
    }
    if (method === 'GET' && path.startsWith('/git/commits/')) return result(commits.get(path.split('/').at(-1)));
    if (method === 'GET' && path.startsWith('/git/trees/')) return result({ truncated: false, tree: Object.entries(trees.get(path.split('/').at(-1).split('?')[0])).map(([path, sha]) => ({ path, sha, type: 'blob' })) });
    if (method === 'GET' && path.startsWith('/git/blobs/')) return result({ encoding: 'base64', content: blobs.get(path.split('/').at(-1)).toString('base64') });
    if (method === 'POST' && path === '/git/blobs') { const bytes = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8'); const sha = blobHash(bytes); blobs.set(sha, bytes); return result({ sha }); }
    if (method === 'POST' && path === '/git/trees') {
      const tree = { ...trees.get(body.base_tree) }; for (const entry of body.tree) { if (entry.sha === null) delete tree[entry.path]; else tree[entry.path] = entry.sha; }
      const sha = hash(JSON.stringify(tree)); trees.set(sha, tree); return result({ sha });
    }
    if (method === 'POST' && path === '/git/commits') {
      const sha = hash(JSON.stringify(body)), commit = { sha, tree: { sha: body.tree }, parents: body.parents.map(sha => ({ sha })) };
      commits.set(sha, commit); return result(mock.badParent ? { ...commit, parents: [] } : commit);
    }
    if (method === 'PATCH' && path === '/git/refs/heads/content%2Fstaging') {
      if (body.force || commits.get(body.sha)?.parents[0]?.sha !== mock.content) return result({}, 409);
      mock.content = body.sha; return result({ object: { sha: body.sha } });
    }
    if (method === 'POST' && path === '/actions/workflows/docker-publish.yml/dispatches') return result({}, mock.dispatchFailure ? 403 : 204);
    throw new Error(`Unexpected mocked GitHub request: ${method} ${path}`);
  };
  mock.text = path => blobs.get(trees.get(commits.get(mock.content).tree.sha)[path])?.toString();
  return mock;
}
