import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readGit } from '../content/git-snapshot.mjs';
import { assertGitSha } from '../content/revision.mjs';
import { stagingEnvironment, BRANCH, REPOSITORY } from './staging-contract.mjs';
import { prepareStagingNews, createNewsCommit } from './staging-content.mjs';
import { createGitHubApi } from './staging-pr.mjs';
import { publishStagingNews } from './staging-publish.mjs';

function gitRemote(repoRoot, args) {
  try { return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
  catch { throw new Error(`Git remote operation failed (${args[0]}). No automatic retry.`); }
}
export function remoteHeads(repoRoot) {
  const lines = gitRemote(repoRoot, ['ls-remote', '--refs', 'origin', 'refs/heads/main', 'refs/heads/content/staging']);
  const refs = new Map(lines.split('\n').map(line => line.trim().split(/\s+/)));
  const find = ref => assertGitSha([...refs].find(([, name]) => name === ref)?.[0], ref);
  return { codeSha: find('refs/heads/main'), contentSha: find('refs/heads/content/staging') };
}
export function assertHeads(expected, actual) {
  if (expected.codeSha !== actual.codeSha || expected.contentSha !== actual.contentSha) throw new Error('main or content/staging moved; rerun required.');
}
export async function runStagingSync({ mode, environment, codeSha, repoRoot, runnerTemp, wordpressBaseUrl,
  token, fetchImpl, heads = () => remoteHeads(repoRoot), prepare = prepareStagingNews, publish = publishStagingNews }) {
  stagingEnvironment(environment);
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error('Invalid WordPress sync mode.');
  assertGitSha(codeSha, 'codeSha');
  if (readGit(repoRoot, ['rev-parse', 'HEAD']).toString().trim() !== codeSha) throw new Error('Executable code checkout must equal bound workflow SHA.');
  const bound = Object.freeze({ ...heads() });
  if (bound.codeSha !== codeSha) throw new Error('Workflow code SHA is not current main.');
  if (!runnerTemp || !path.isAbsolute(runnerTemp)) throw new Error('RUNNER_TEMP required.');
  const temp = await mkdtemp(path.join(runnerTemp, 'wordpress-staging-'));
  try {
    const prepared = await prepare({ environment, ...bound, repoRoot, output: path.join(temp, 'site'), wordpressBaseUrl, fetchImpl });
    const checkHeads = () => assertHeads(bound, heads());
    checkHeads();
    if (mode === 'validate-only') {
      const { generatedFiles, ...diff } = prepared.summary;
      return { action: 'validated', revision: prepared.revision, diff };
    }
    const api = createGitHubApi(token);
    return await publish({ prepared, api, checkHeads,
      createCommit: () => createNewsCommit(repoRoot, prepared),
      push: (sha, previous) => gitRemote(repoRoot, ['push', `--force-with-lease=refs/heads/${BRANCH}:${previous}`, 'origin', `${assertGitSha(sha, 'headSha')}:refs/heads/${BRANCH}`]) });
  } finally { await rm(temp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Run the WordPress workflow from main only.');
    if (process.env.GITHUB_REPOSITORY !== REPOSITORY) throw new Error('Unexpected workflow repository.');
    const result = await runStagingSync({ mode: process.env.SYNC_MODE, environment: process.env.SYNC_ENVIRONMENT,
      codeSha: process.env.GITHUB_SHA, repoRoot: process.cwd(), runnerTemp: process.env.RUNNER_TEMP,
      wordpressBaseUrl: process.env.WORDPRESS_BASE_URL, token: process.env.GH_TOKEN });
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
