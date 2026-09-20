import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { planSiteComposition } from './composition-plan.mjs';

function diskFiles(root, relative = '') {
  if (lstatSync(path.join(root, relative)).isSymbolicLink()) throw new Error('Symlink im Buildcontext.');
  const result = [];
  for (const name of readdirSync(path.join(root, relative))) {
    const file = relative ? `${relative}/${name}` : name;
    const stat = lstatSync(path.join(root, file));
    if (stat.isSymbolicLink()) throw new Error('Symlink im Buildcontext.');
    if (!stat.isFile() && !stat.isDirectory()) throw new Error('Unerlaubter Dateityp im Buildcontext.');
    if (stat.isDirectory()) {
      const nested = diskFiles(root, file);
      if (!nested.length) throw new Error('Unerwartetes leeres Verzeichnis im Buildcontext.');
      result.push(...nested);
    } else result.push({ path: file, stat });
  }
  return result;
}

export function validateComposedSite(options) {
  // Re-derive expectations from immutable Git objects, never trust a report file.
  const plan = planSiteComposition(options);
  if (options.contentTreeSha !== plan.contentTreeSha) throw new Error('Content-Tree stimmt nicht mit Erwartung überein.');
  const expected = new Map(plan.expected.map(entry => [entry.path, entry]));
  for (const file of diskFiles(options.output)) {
    const entry = expected.get(file.path);
    if (!entry) throw new Error('Unerwarteter Pfad im Buildcontext.');
    const bytes = readFileSync(path.join(options.output, file.path));
    const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (sha !== entry.sha) throw new Error('Buildcontext-Blob stimmt nicht mit Git überein.');
    if (process.platform !== 'win32' && (file.stat.mode & 0o777) !== (entry.mode === '100755' ? 0o755 : 0o644)) {
      throw new Error('Buildcontext-Mode stimmt nicht mit Git überein.');
    }
    expected.delete(file.path);
  }
  if (expected.size) throw new Error('Erwartete Dateien fehlen im Buildcontext.');
  return { environment: plan.environment, codeSha: plan.codeSha, contentRef: plan.contentRef,
    contentSha: plan.contentSha, contentTreeSha: plan.contentTreeSha, manifestVersion: plan.manifestVersion,
    artifactId: plan.artifactId, contentFileCount: plan.inventory.total, inventory: plan.inventory,
    removedPaths: plan.removedPaths, removedUnknownPaths: plan.removedUnknownPaths,
    retainedCodeFiles: plan.retainedCodeFiles, valid: true };
}
