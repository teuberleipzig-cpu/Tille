import { execFileSync } from 'node:child_process';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

// Synthetic repositories only; never creates objects or refs in the project repo.
export function fixtureGit(root, args, input) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
    GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z', GIT_CONFIG_NOSYSTEM: '1' });
  return execFileSync('git', args, { cwd: root, env, input, stdio: ['pipe', 'pipe', 'pipe'] });
}

export async function fixtureRepo() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'tille-bootstrap-test-'));
  fixtureGit(root, ['init', '--quiet', '--object-format=sha1', '--initial-branch=fixture']);
  return root;
}

export function fixtureBlob(root, bytes) {
  return fixtureGit(root, ['hash-object', '-w', '--stdin'], bytes).toString().trim();
}

function writeDirectory(root, directory) {
  const lines = [...directory].map(([name, value]) => value instanceof Map
    ? `040000 tree ${writeDirectory(root, value)}\t${name}\0`
    : `${value.mode || '100644'} ${value.type || 'blob'} ${value.sha}\t${name}\0`);
  // Git, not the production hash implementation, sorts and hashes these fixtures.
  return fixtureGit(root, ['mktree', '-z'], lines.join('')).toString().trim();
}

export function fixtureCommit(root, entries, parent) {
  const directory = new Map();
  for (const entry of entries) {
    const parts = entry.path.split('/');
    let node = directory;
    for (const segment of parts.slice(0, -1)) {
      if (!node.has(segment)) node.set(segment, new Map());
      node = node.get(segment);
    }
    node.set(parts.at(-1), entry);
  }
  const tree = writeDirectory(root, directory);
  const commit = fixtureGit(root, ['commit-tree', tree, ...(parent ? ['-p', parent] : [])], 'Synthetic fixture\n').toString().trim();
  return { tree, commit };
}

export async function diskInventory(root, relative = '') {
  const result = {};
  for (const item of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${item.name}` : item.name;
    if (item.isDirectory()) Object.assign(result, await diskInventory(root, name));
    else result[name] = createHash('sha256').update(await readFile(path.join(root, name))).digest('hex');
  }
  return result;
}
