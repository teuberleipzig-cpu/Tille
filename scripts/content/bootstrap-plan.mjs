import { resolveEnvironment, bindContentEnvironment } from './environments.mjs';
import { readCommitSnapshot } from './git-snapshot.mjs';
import { projectContent, assertContentTree } from './content-projection.mjs';

export function planContentBootstrap({ repoRoot = process.cwd(), environment, sourceSha }) {
  const config = resolveEnvironment(environment);
  const source = readCommitSnapshot({ repoRoot, commitSha: sourceSha });
  const projection = projectContent(source.entries);
  return { ...projection, environment: config.environment, targetRef: config.contentRef,
    sourceSha: source.commitSha, sourceTreeSha: source.treeSha, dryRun: true };
}

export function validateContentCommit({ repoRoot = process.cwd(), environment, contentRef, contentSha }) {
  const config = bindContentEnvironment(environment, contentRef);
  const snapshot = readCommitSnapshot({ repoRoot, commitSha: contentSha });
  const projection = assertContentTree(snapshot);
  return { ...projection, environment: config.environment, targetRef: config.contentRef, commitSha: snapshot.commitSha };
}
