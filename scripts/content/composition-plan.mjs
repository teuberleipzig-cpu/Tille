import { planContentBuild } from './build-plan.mjs';
import { readCommitSnapshot } from './git-snapshot.mjs';
import { replacementScope } from './replacement-scope.mjs';
import { assertMaterializableEntries } from './snapshot-materializer.mjs';

export function planSiteComposition(options) {
  // B1c-1 deliberately exposes no live composition path.
  if (options.environment !== 'staging') throw new Error('Composer ist nur für staging freigegeben.');
  const plan = planContentBuild(options);
  const code = readCommitSnapshot({ repoRoot: options.repoRoot, commitSha: plan.codeSha });
  const owns = replacementScope();
  const files = code.entries.filter(entry => entry.type !== 'tree');
  assertMaterializableEntries(files);
  const removed = files.filter(entry => owns(entry.path));
  const retained = files.filter(entry => !owns(entry.path));
  const expected = [...retained, ...plan.overlay];
  assertMaterializableEntries(expected);
  return { ...plan, expected, removedPaths: removed.map(entry => entry.path),
    removedUnknownPaths: removed.filter(entry => !plan.removePaths.includes(entry.path)).map(entry => entry.path),
    retainedCodeFiles: retained.length };
}
