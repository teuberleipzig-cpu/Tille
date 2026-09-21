import { execFileSync } from 'node:child_process';
import { composeSite } from '../content/site-composition.mjs';
import { readCommitSnapshot, readGit } from '../content/git-snapshot.mjs';
import { validateContentCommit } from '../content/bootstrap-plan.mjs';
import { assertGitSha } from '../content/revision.mjs';
import { prepareNewsSync } from './prepare-sync.mjs';
import { readNewsOutput, assertNewsOutputContentSafe } from './news-sync.mjs';
import { stagingRevision, assertNewsScope, assertSharedSitemap } from './staging-contract.mjs';

export async function prepareStagingNews(options) {
  const revision = stagingRevision(options);
  const composition = composeSite({ ...options, ...revision });
  const before = await readNewsOutput(options.output);
  const summary = await prepareNewsSync({ mode: 'validate-only', workspaceRoot: options.output,
    wordpressBaseUrl: options.wordpressBaseUrl, fetchImpl: options.fetchImpl, returnFiles: true });
  assertNewsScope(summary.changedFiles);
  assertNewsScope([...summary.generatedFiles.keys()]);
  assertSharedSitemap(before.get('sitemap.xml'), summary.generatedFiles.get('sitemap.xml'));
  return { revision, composition, summary };
}

// Only sync-pr calls this plumbing. No checkout/index/ref writes; one immutable parent.
export function writeGit(repoRoot, args, input) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith('GIT_')));
  Object.assign(env, { GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'github-actions[bot]', GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
    GIT_COMMITTER_NAME: 'github-actions[bot]', GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com' });
  try { return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], { cwd: repoRoot, env, input,
    maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }).toString('utf8').trim(); }
  catch { throw new Error(`WordPress Git operation failed (${args[0]}). No automatic retry.`); }
}
function treeFromFiles(repoRoot, files) {
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
export function createNewsCommit(repoRoot, prepared) {
  const { revision, summary } = prepared;
  stagingRevision(revision);
  if (!summary.hasChanges) return null;
  if (!['news.html', 'news/index.html', 'sitemap.xml'].every(file => summary.generatedFiles.has(file))) throw new Error('Incomplete generated News output.');
  assertNewsScope(summary.changedFiles);
  assertNewsScope([...summary.generatedFiles.keys()]);
  assertNewsOutputContentSafe(summary.generatedFiles);
  const base = validateContentCommit({ repoRoot, ...revision });
  const files = new Map(base.files.map(file => [file.path, file.sha]));
  const beforeXml = readGit(repoRoot, ['show', `${revision.contentSha}:sitemap.xml`]).toString('utf8');
  assertSharedSitemap(beforeXml, summary.generatedFiles.get('sitemap.xml'));
  for (const file of summary.changedFiles) {
    if (!summary.generatedFiles.has(file)) files.delete(file);
    else files.set(file, writeGit(repoRoot, ['hash-object', '-w', '--stdin'], summary.generatedFiles.get(file)));
  }
  const tree = treeFromFiles(repoRoot, files);
  const commit = assertGitSha(writeGit(repoRoot, ['commit-tree', tree, '-p', revision.contentSha],
    'chore: sync WordPress news to staging\n'), 'commitSha');
  validateContentCommit({ repoRoot, ...revision, contentSha: commit });
  const actual = readGit(repoRoot, ['diff-tree', '--no-commit-id', '--name-only', '-r', '-z', revision.contentSha, commit])
    .toString('utf8').split('\0').filter(Boolean).sort();
  assertNewsScope(actual);
  if (JSON.stringify(actual) !== JSON.stringify([...summary.changedFiles].sort())) throw new Error('Content commit diff differs from validated News output.');
  const snapshot = readCommitSnapshot({ repoRoot, commitSha: commit });
  if (snapshot.treeSha !== tree) throw new Error('Content commit tree mismatch.');
  return commit;
}
