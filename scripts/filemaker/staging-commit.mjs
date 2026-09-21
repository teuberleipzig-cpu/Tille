import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateContentCommit } from '../content/bootstrap-plan.mjs';
import { readGit } from '../content/git-snapshot.mjs';
import { assertWriterPaths } from './staging-contract.mjs';

function writeGit(root, args, input) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_COMMITTER_NAME: 'github-actions[bot]',
    GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
    GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' });
  try {
    return execFileSync('git', ['--no-replace-objects', ...args], { cwd: root, env, input,
      maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim();
  } catch { throw new Error(`FileMaker content object creation failed (${args[0]}).`); }
}

function writeTree(root, node) {
  const records = [...node].map(([name, value]) => value instanceof Map
    ? `040000 tree ${writeTree(root, value)}\t${name}\0`
    : `100644 blob ${value}\t${name}\0`);
  return writeGit(root, ['mktree', '-z'], records.join(''));
}

export function verifyContentHead(repoRoot, binding, headSha, expectedFiles) {
  validateContentCommit({ repoRoot, ...binding, contentSha: headSha });
  const parents = readGit(repoRoot, ['show', '-s', '--format=%P', headSha]).toString().trim();
  if (parents !== binding.contentSha) throw new Error('FileMaker commit must have exactly the bound content parent.');
  const files = readGit(repoRoot, ['diff', '--no-renames', '--name-only', '-z', binding.contentSha, headSha])
    .toString().split('\0').filter(Boolean).sort();
  assertWriterPaths(binding, files);
  if (!files.length || JSON.stringify(files) !== JSON.stringify([...expectedFiles].sort())) {
    throw new Error('Content commit diff differs from generated FileMaker outputs.');
  }
  return files;
}

export async function createContentHead({ repoRoot, binding, prepared }) {
  if (binding.mode !== 'sync-pr' || !prepared.hasChanges) throw new Error('No content commit permitted.');
  assertWriterPaths(binding, prepared.changedFiles);
  const base = validateContentCommit({ repoRoot, ...binding });
  const entries = new Map(base.files.map(file => [file.path, file.sha]));
  for (const file of prepared.changedFiles) {
    try {
      const bytes = await readFile(path.join(prepared.workspace, file));
      entries.set(file, writeGit(repoRoot, ['hash-object', '-w', '--stdin'], bytes));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      entries.delete(file);
    }
  }
  const root = new Map();
  for (const [file, sha] of entries) {
    const parts = file.split('/');
    let node = root;
    for (const segment of parts.slice(0, -1)) {
      if (!node.has(segment)) node.set(segment, new Map());
      node = node.get(segment);
      if (!(node instanceof Map)) throw new Error('Content tree path collision.');
    }
    node.set(parts.at(-1), sha);
  }
  const tree = writeTree(repoRoot, root);
  const headSha = writeGit(repoRoot, ['commit-tree', tree, '-p', binding.contentSha], 'chore: apply staging filemaker event intake\n');
  verifyContentHead(repoRoot, binding, headSha, prepared.changedFiles);
  return headSha;
}
