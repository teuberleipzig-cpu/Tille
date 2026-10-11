import { planContentBuild } from './build-plan.mjs';
import { readCommitSnapshot } from './git-snapshot.mjs';
import { replacementScope } from './replacement-scope.mjs';
import { assertMaterializableEntries } from './snapshot-materializer.mjs';
import { CONTENT_MANIFEST } from './content-manifest.mjs';

export function planSiteComposition(options) {
  // B1c-1 deliberately exposes no live composition path.
  if (options.environment !== 'staging') throw new Error('Composer ist nur für staging freigegeben.');
  const plan = planContentBuild(options);
  const code = readCommitSnapshot({ repoRoot: options.repoRoot, commitSha: plan.codeSha });
  const replaces = replacementScope();
  // Only explicitly opted-in root templates survive before their first publication.
  // All other content namespaces retain their existing deletion semantics.
  const fallback = new Set(CONTENT_MANIFEST.rules.filter(rule => rule.codeFallback && rule.exact &&
    !plan.overlay.some(file => file.path === rule.exact)).map(rule => rule.exact));
  const owns = path => replaces(path) && !fallback.has(path);
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
