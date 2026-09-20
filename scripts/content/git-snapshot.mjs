import { execFileSync } from 'node:child_process';
import { assertGitSha } from './revision.mjs';

// Read-only plumbing, without inherited Git redirection, replace refs or lazy fetch.
export function readGit(repoRoot, args, input) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' });
  try {
    return execFileSync('git', ['--no-replace-objects', ...args], {
      cwd: repoRoot, env, input, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch {
    throw new Error(`Lokales Git-Lesen fehlgeschlagen (${args[0]}). Commit/Objekte müssen lokal vorhanden sein.`);
  }
}

function parseTree(buffer) {
  const records = new TextDecoder('utf-8', { fatal: true }).decode(buffer).split('\0');
  if (records.pop() !== '') throw new Error('Unvollständige Git-Tree-Ausgabe.');
  return records.map(record => {
    const separator = record.indexOf('\t');
    const header = record.slice(0, separator);
    const match = /^(\d{6}) (blob|tree|commit) ([a-f0-9]{40})$/.exec(header);
    if (!match || separator < 0) throw new Error('Ungültiger Git-Tree-Eintrag.');
    return { mode: match[1], type: match[2], sha: match[3], path: record.slice(separator + 1) };
  });
}

function verifyBlobs(repoRoot, entries) {
  const shas = [...new Set(entries.filter(entry => entry.type === 'blob').map(entry => entry.sha))].sort();
  if (!shas.length) return;
  const output = readGit(repoRoot, ['cat-file', '--batch-check=%(objectname) %(objecttype)'], shas.join('\n') + '\n').toString('utf8').trim().split('\n');
  if (output.length !== shas.length || output.some((line, index) => line !== `${shas[index]} blob`)) {
    throw new Error('Git-Tree enthält fehlende oder ungültige Blobobjekte.');
  }
}

export function readCommitSnapshot({ repoRoot = process.cwd(), commitSha }) {
  assertGitSha(commitSha, 'commitSha');
  if (readGit(repoRoot, ['rev-parse', '--show-object-format']).toString('utf8').trim() !== 'sha1') {
    throw new Error('Nur Git-SHA-1-Repositories werden unterstützt.');
  }
  if (readGit(repoRoot, ['cat-file', '-t', commitSha]).toString('utf8').trim() !== 'commit') {
    throw new Error('Expliziter SHA muss ein Commitobjekt sein, kein Tree, Blob oder Tag.');
  }
  const treeSha = readGit(repoRoot, ['rev-parse', `${commitSha}^{tree}`]).toString('utf8').trim();
  assertGitSha(treeSha, 'treeSha');
  const entries = parseTree(readGit(repoRoot, ['ls-tree', '-r', '-t', '-z', '--full-tree', treeSha]));
  verifyBlobs(repoRoot, entries);
  return { commitSha, treeSha, entries };
}
