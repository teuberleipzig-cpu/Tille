import { contentRevision } from './revision.mjs';
import { readCommitSnapshot } from './git-snapshot.mjs';
import { projectContent } from './content-projection.mjs';
import { validateContentCommit } from './bootstrap-plan.mjs';

// Read-only plan. All previous content is removed before overlay, including deletions.
export function planContentBuild({ repoRoot = process.cwd(), environment, contentRef, codeSha, contentSha }) {
  const revision = contentRevision({ environment, contentRef, codeSha, contentSha });
  const code = readCommitSnapshot({ repoRoot, commitSha: codeSha });
  const content = validateContentCommit({ repoRoot, environment, contentRef, contentSha });
  const previous = projectContent(code.entries);
  const removePaths = previous.files.map(file => file.path);
  const remaining = code.entries.filter(entry => entry.type !== 'tree' && !removePaths.includes(entry.path));
  for (const file of content.files) {
    const collision = remaining.find(entry => entry.path === file.path || file.path.startsWith(entry.path + '/') || entry.path.startsWith(file.path + '/'));
    if (collision) throw new Error(`Content würde Code/ungeprüften Pfad überschreiben: ${JSON.stringify(collision.path)}`);
  }
  return { ...revision, contentTreeSha: content.treeSha, manifestVersion: content.manifestVersion,
    inventory: content.inventory, removePaths, overlay: content.files,
    steps: ['checkout-isolated-code', 'remove-all-classified-content', 'overlay-validated-content',
      'verify-no-code-overwrite', 'validate-final-tree', 'use-bound-build-target', 'build-image', 'record-digest'],
    dryRun: true };
}
