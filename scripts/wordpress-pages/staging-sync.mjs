import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGit } from '../content/git-snapshot.mjs';
import { assertGitSha } from '../content/revision.mjs';
import { remoteHeads, assertHeads } from '../news/staging-sync.mjs';
import { createGitHubApi } from '../news/staging-pr.mjs';
import { pagesConfig, BRANCH, REPOSITORY } from './contract.mjs';
import { prepareStagingPages, createPagesCommit } from './staging-content.mjs';
import { publishStagingPages } from './staging-publish.mjs';

function pushCandidate(repoRoot, sha, previous) {
  try {
    execFileSync('git', ['push', `--force-with-lease=refs/heads/${BRANCH}:${previous}`, 'origin',
      `${assertGitSha(sha, 'headSha')}:refs/heads/${BRANCH}`], { cwd: repoRoot, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch { throw new Error('Pages push failed. No automatic retry.'); }
}
export async function runPagesSync(options) {
  pagesConfig(options); // Both IDs and environment fail before REST or GitHub mutation.
  const { mode, codeSha, repoRoot, runnerTemp, token, heads = () => remoteHeads(repoRoot),
    prepare = prepareStagingPages, publish = publishStagingPages } = options;
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error('Invalid Pages sync mode.');
  assertGitSha(codeSha, 'codeSha');
  if (readGit(repoRoot, ['rev-parse', 'HEAD']).toString().trim() !== codeSha) throw new Error('Executable checkout must equal bound workflow SHA.');
  const bound = Object.freeze({ ...heads() });
  if (bound.codeSha !== codeSha) throw new Error('Workflow SHA is not current main.');
  if (!runnerTemp || !path.isAbsolute(runnerTemp)) throw new Error('RUNNER_TEMP required.');
  const temp = await mkdtemp(path.join(runnerTemp, 'wordpress-pages-'));
  try {
    const prepared = await prepare({ ...options, ...bound, output: path.join(temp, 'site') });
    const checkHeads = () => assertHeads(bound, heads());
    checkHeads();
    if (mode === 'validate-only') {
      const { generatedFiles, ...diff } = prepared.summary;
      return { action: 'validated', revision: prepared.revision, diff };
    }
    return await publish({ prepared, api: createGitHubApi(token), checkHeads,
      createCommit: () => createPagesCommit(repoRoot, prepared),
      push: (sha, previous) => pushCandidate(repoRoot, sha, previous) });
  } finally { await rm(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Run the Pages workflow from main only.');
    if (process.env.GITHUB_REPOSITORY !== REPOSITORY) throw new Error('Unexpected workflow repository.');
    const result = await runPagesSync({ mode: process.env.SYNC_MODE, environment: process.env.SYNC_ENVIRONMENT,
      codeSha: process.env.GITHUB_SHA, repoRoot: process.cwd(), runnerTemp: process.env.RUNNER_TEMP,
      wordpressBaseUrl: process.env.WORDPRESS_BASE_URL, aboutPageId: process.env.WORDPRESS_ABOUT_PAGE_ID,
      historyPageId: process.env.WORDPRESS_HISTORY_PAGE_ID, token: process.env.GH_TOKEN });
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
