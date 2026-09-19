import { CONTENT_MANIFEST } from './content-manifest.mjs';
import { classifyContentPath, assertRepoPath } from './content-scope.mjs';
import { projectedTreeSha } from './git-tree-hash.mjs';

function sourceRule(path) {
  try { assertRepoPath(path); } catch { return null; }
  return classifyContentPath(path);
}

export function projectContent(entries) {
  const files = [], excluded = [];
  for (const entry of entries) {
    const rule = sourceRule(entry.path);
    if (!rule || rule.classification === 'CODE') {
      if (entry.type !== 'tree') excluded.push({ path: entry.path, reason: rule ? 'CODE' : 'UNKNOWN' });
      continue;
    }
    if (entry.mode !== '100644' || entry.type !== 'blob') {
      throw new Error(`Content muss normaler 100644-Blob sein: ${JSON.stringify(entry.path)} (${entry.mode}/${entry.type}).`);
    }
    files.push({ ...entry, ruleId: rule.id, classification: rule.classification });
  }
  files.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  excluded.sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)));
  const byRule = Object.fromEntries(CONTENT_MANIFEST.rules.filter(rule => rule.classification !== 'CODE').map(rule => [rule.id, 0]));
  let mutable = 0, generated = 0;
  for (const file of files) {
    byRule[file.ruleId] += 1;
    if (file.classification === 'MUTABLE') mutable += 1;
    else generated += 1;
  }
  return { files, excluded, manifestVersion: CONTENT_MANIFEST.version, treeSha: projectedTreeSha(files),
    inventory: { total: files.length, mutable, generated, byRule },
    excludedCounts: { code: excluded.filter(entry => entry.reason === 'CODE').length, unknown: excluded.filter(entry => entry.reason === 'UNKNOWN').length } };
}

export function assertContentTree(snapshot) {
  const projection = projectContent(snapshot.entries);
  if (projection.excluded.length) {
    throw new Error(`Content-Tree enthält unerlaubte Pfade: ${projection.excluded.map(entry => JSON.stringify(entry.path)).join(', ')}`);
  }
  // Also detects extra empty directory trees: no unclassified tree is silently retained.
  if (projection.treeSha !== snapshot.treeSha) throw new Error('Content-Tree ist nicht exakt der erlaubte Datei-Tree (z.B. leere zusätzliche Verzeichnisse).');
  return projection;
}
