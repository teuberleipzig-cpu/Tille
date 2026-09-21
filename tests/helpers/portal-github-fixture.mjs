// Synthetic in-memory GitHub; shared by Node tests and local browser QA. No network.
export const fixtureResident = () => ({ id: 'fixture-resident', name: 'Fixture Resident', city: 'Leipzig',
  portal: { enabled: true, inviteId: 'fixture-invite', code: 'FIXTURE-CODE' },
  futureField: { retained: true }, newsItems: [{ date: '2026-09-01', text: 'Fixture news', extra: 42 }],
  releases: [{ title: 'Fixture Release', futureRelease: true, tracks: [{ title: 'Track', extra: 1 }] }] });
export const fixtureData = () => ({ schema: 'fixture', residents: [fixtureResident(), { id: 'other', untouched: { x: 1 } }] });
const encode = text => btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join(''));
const decode = text => new TextDecoder().decode(Uint8Array.from(atob(text), c => c.charCodeAt(0)));
const residentPath = 'public/residents/data/residents.json';
export function githubFixture(data = fixtureData()) {
  let counter = 16;
  const sha = () => (++counter).toString(16).padStart(40, '0');
  let head = sha();
  let main = sha();
  const blobs = new Map();
  const trees = new Map();
  const commits = new Map();
  const firstBlob = sha();
  blobs.set(firstBlob, encode(JSON.stringify(data)));
  const firstTree = sha();
  trees.set(firstTree, { [residentPath]: firstBlob });
  commits.set(head, { tree: { sha: firstTree }, parents: [] });
  const calls = [];
  const controls = { dispatch403: false, moveBeforePatch: false, moveAfterPatch: false, blobFallback: false };
  const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => structuredClone(body) });
  const move = () => { const old = head; head = sha(); commits.set(head, structuredClone(commits.get(old))); };
  async function fetcher(url, options = {}) {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://api.github.com') throw new Error('Mock forbids network');
    const path = parsed.pathname.replace('/repos/teuberleipzig-cpu/Tille/', '');
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ url, method, body }); // deliberately excludes Authorization
    if (path === 'git/ref/heads/content/staging') return response({ object: { sha: head } });
    if (path === 'git/ref/heads/main') return response({ object: { sha: main } });
    if (path.startsWith('contents/')) {
      const commit = commits.get(parsed.searchParams.get('ref'));
      const blob = commit && trees.get(commit.tree.sha)[decodeURIComponent(path.slice(9))];
      return blob ? response({ type: 'file', sha: blob, content: controls.blobFallback ? '' : blobs.get(blob) }) : response({}, 404);
    }
    if (path.startsWith('git/commits/') && method === 'GET') return response(commits.get(path.slice(12)));
    if (path.startsWith('git/blobs/') && method === 'GET') return response({ content: blobs.get(path.slice(10)) });
    if (path === 'git/blobs' && method === 'POST') { const id = sha(); blobs.set(id, body.content); return response({ sha: id }); }
    if (path === 'git/trees' && method === 'POST') {
      const tree = { ...trees.get(body.base_tree) };
      for (const entry of body.tree) { if (entry.sha === null) delete tree[entry.path]; else tree[entry.path] = entry.sha; }
      const id = sha(); trees.set(id, tree); return response({ sha: id });
    }
    if (path === 'git/commits' && method === 'POST') {
      const id = sha(); commits.set(id, { tree: { sha: body.tree }, parents: body.parents }); return response({ sha: id });
    }
    if (path === 'git/refs/heads/content/staging' && method === 'PATCH') {
      if (controls.moveBeforePatch) move();
      if (body.force !== false || commits.get(body.sha).parents[0] !== head) return response({}, 422);
      head = body.sha;
      if (controls.moveAfterPatch) move();
      return response({ object: { sha: head } });
    }
    if (path === 'actions/workflows/docker-publish.yml/dispatches') return response(null, controls.dispatch403 ? 403 : 204);
    throw new Error(`Unmocked operation: ${method} ${path}`);
  }
  return { fetcher, calls, controls, move, head: () => head, main: () => main,
    data: () => JSON.parse(decode(blobs.get(trees.get(commits.get(head).tree.sha)[residentPath]))),
    files: () => Object.keys(trees.get(commits.get(head).tree.sha)) };
}
