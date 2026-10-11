import { composeSite } from '../content/site-composition.mjs';
import { readCommitSnapshot, readGit } from '../content/git-snapshot.mjs';
import { validateContentCommit } from '../content/bootstrap-plan.mjs';
import { assertGitSha } from '../content/revision.mjs';
import { writeGit } from '../news/staging-content.mjs';
import { assertNewsOutputContentSafe } from '../news/news-sync.mjs';
import { stagingRevision, pagesConfig, PAGE_PATHS, assertPagesScope } from './contract.mjs';
import { fetchPages } from './page-client.mjs';
import { generatePages } from './page-render.mjs';

export function diffPages(repoRoot, contentSha, generatedFiles) {
  assertPagesScope([...generatedFiles.keys()]);
  if (generatedFiles.size !== 2) throw new Error('Incomplete Pages output.');
  const base = validateContentCommit({ repoRoot, environment: 'staging', contentRef: 'content/staging', contentSha });
  return PAGE_PATHS.filter(file => {
    const entry = base.files.find(item => item.path === file);
    return !entry || !readGit(repoRoot, ['cat-file', 'blob', entry.sha]).equals(Buffer.from(generatedFiles.get(file), 'utf8'));
  });
}
export async function prepareStagingPages(options) {
  pagesConfig(options);
  const revision = stagingRevision(options);
  const composition = composeSite({ ...options, ...revision });
  // Never use the composed/content version as the shell. Read the immutable CODE blobs.
  const code = readCommitSnapshot({ repoRoot: options.repoRoot, commitSha: revision.codeSha });
  const templates = new Map(PAGE_PATHS.map(file => {
    const entry = code.entries.find(item => item.path === file && item.type === 'blob' && item.mode === '100644');
    if (!entry) throw new Error('Code Page template missing.');
    return [file, readGit(options.repoRoot, ['cat-file', 'blob', entry.sha]).toString('utf8')];
  }));
  const pages = await fetchPages(options);
  const generatedFiles = generatePages(templates, pages);
  const changedFiles = diffPages(options.repoRoot, revision.contentSha, generatedFiles);
  return { revision, composition, summary: { generatedFiles, changedFiles, hasChanges: changedFiles.length > 0 } };
}

function writeTree(repoRoot, files) {
  const root = new Map();
  for (const [file, sha] of files) {
    const parts = file.split('/'); let node = root;
    for (const part of parts.slice(0, -1)) { if (!node.has(part)) node.set(part, new Map()); node = node.get(part); }
    node.set(parts.at(-1), sha);
  }
  function directory(node) {
    const entries = [...node].map(([name, value]) => value instanceof Map
      ? `040000 tree ${directory(value)}\t${name}\0` : `100644 blob ${value}\t${name}\0`);
    return assertGitSha(writeGit(repoRoot, ['mktree', '-z'], entries.join('')), 'treeSha');
  }
  return directory(root);
}
export function createPagesCommit(repoRoot, { revision, summary }) {
  stagingRevision(revision);
  assertPagesScope(summary.changedFiles);
  assertNewsOutputContentSafe(summary.generatedFiles);
  const actualPlan = diffPages(repoRoot, revision.contentSha, summary.generatedFiles);
  if (JSON.stringify(actualPlan) !== JSON.stringify(summary.changedFiles) || summary.hasChanges !== Boolean(actualPlan.length)) {
    throw new Error('Pages diff differs from validated output.');
  }
  if (!actualPlan.length) return null;
  const base = validateContentCommit({ repoRoot, ...revision });
  const files = new Map(base.files.map(file => [file.path, file.sha]));
  for (const file of actualPlan) files.set(file, writeGit(repoRoot, ['hash-object', '-w', '--stdin'], summary.generatedFiles.get(file)));
  const tree = writeTree(repoRoot, files);
  const commit = assertGitSha(writeGit(repoRoot, ['commit-tree', tree, '-p', revision.contentSha],
    'chore: sync WordPress pages to staging\n'), 'commitSha');
  validateContentCommit({ repoRoot, ...revision, contentSha: commit });
  const actual = readGit(repoRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', revision.contentSha, commit])
    .toString('utf8').split('\0').filter(Boolean).sort();
  assertPagesScope(actual);
  if (JSON.stringify(actual) !== JSON.stringify(actualPlan) ||
      readGit(repoRoot, ['show', '-s', '--format=%P', commit]).toString().trim() !== revision.contentSha ||
      readCommitSnapshot({ repoRoot, commitSha: commit }).treeSha !== tree) throw new Error('Pages commit verification failed.');
  return commit;
}
