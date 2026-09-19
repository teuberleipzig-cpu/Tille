import { createHash } from 'node:crypto';
import { assertRepoPath } from './content-scope.mjs';
import { assertGitSha } from './revision.mjs';

function insert(root, entry) {
  assertRepoPath(entry.path);
  assertGitSha(entry.sha, 'blobSha');
  if (entry.mode !== '100644' || entry.type !== 'blob') throw new Error(`Unerlaubter Content-Modus: ${JSON.stringify(entry.path)}`);
  const parts = entry.path.split('/');
  let node = root;
  for (const segment of parts.slice(0, -1)) {
    if (!node.has(segment)) node.set(segment, new Map());
    node = node.get(segment);
    if (!(node instanceof Map)) throw new Error('Datei-/Verzeichniskollision im Content-Tree.');
  }
  const name = parts.at(-1);
  if (node.has(name)) throw new Error('Doppelter Pfad oder Datei-/Verzeichniskollision im Content-Tree.');
  node.set(name, entry.sha);
}

function hashDirectory(directory) {
  // Git compares directory names with a trailing slash (not locale collation).
  const children = [...directory].map(([name, value]) => ({
    name, directory: value instanceof Map, sha: value instanceof Map ? hashDirectory(value) : value
  })).sort((a, b) => Buffer.compare(Buffer.from(a.name + (a.directory ? '/' : '')), Buffer.from(b.name + (b.directory ? '/' : ''))));
  const body = Buffer.concat(children.map(child => Buffer.concat([
    Buffer.from(`${child.directory ? '40000' : '100644'} ${child.name}\0`, 'utf8'),
    Buffer.from(child.sha, 'hex')
  ])));
  return createHash('sha1').update(`tree ${body.length}\0`).update(body).digest('hex');
}

// Pure in-memory Git tree encoding. No mktree/write-tree, index or object writes.
export function projectedTreeSha(entries) {
  const root = new Map();
  for (const entry of entries) insert(root, entry);
  return hashDirectory(root);
}
