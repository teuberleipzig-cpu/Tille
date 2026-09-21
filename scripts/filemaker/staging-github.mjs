import { execFileSync } from 'node:child_process';
import { assertGitSha } from '../content/revision.mjs';
import { createContentHead, verifyContentHead } from './staging-commit.mjs';
import { readGit } from '../content/git-snapshot.mjs';

function command(repoRoot, binary, args) {
  try {
    return execFileSync(binary, args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch { throw new Error(`FileMaker ${binary} ${args[0]} failed; no automatic retry.`); }
}

export function remoteRevisions(repoRoot) {
  const rows = command(repoRoot, 'git', ['ls-remote', '--heads', 'origin', 'refs/heads/main', 'refs/heads/content/staging'])
    .split('\n').map(row => row.split(/\s+/));
  const values = new Map(rows.map(([sha, ref]) => [ref, sha]));
  return { codeSha: assertGitSha(values.get('refs/heads/main'), 'main'),
    contentSha: assertGitSha(values.get('refs/heads/content/staging'), 'content/staging') };
}

export function fetchBoundContent(repoRoot, binding) {
  command(repoRoot, 'git', ['fetch', '--no-tags', '--no-write-fetch-head', 'origin', binding.contentSha]);
}

export function githubWriterIO({ repoRoot, binding, repository, execute = command }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('Invalid repository identity.');
  const gh = (...args) => execute(repoRoot, 'gh', args);
  const endpoint = `repos/${repository}/pulls`;
  const paged = url => JSON.parse(gh('api', '--paginate', '--slurp', url)).flat();
  const pull = number => JSON.parse(gh('api', `${endpoint}/${number}`));
  return {
    repository,
    revisions: async () => remoteRevisions(repoRoot),
    pulls: async () => paged(`${endpoint}?state=open&base=${encodeURIComponent(binding.contentRef)}&per_page=100`),
    pull: async number => pull(number),
    files: async number => paged(`${endpoint}/${number}/files?per_page=100`),
    verifyHead: async (headSha, files) => verifyContentHead(repoRoot, binding, headSha, files),
    branchHead: async branch => {
      const value = execute(repoRoot, 'git', ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`]);
      return value ? assertGitSha(value.split(/\s+/)[0], 'previous automation head') : '';
    },
    commit: prepared => createContentHead({ repoRoot, binding, prepared }),
    push: async (headSha, previousHead) => execute(repoRoot, 'git', ['push',
      `--force-with-lease=refs/heads/${binding.branch}:${previousHead}`, 'origin', `${headSha}:refs/heads/${binding.branch}`]),
    draft: async (number, prepared) => {
      const title = `FileMaker staging event: ${prepared.operation} ${binding.eventId}`;
      const body = `FileMaker Event Intake V1\n\nEnvironment: staging\nEvent: ${binding.eventId}\n`
        + `Code SHA: ${binding.codeSha}\nContent base SHA: ${binding.contentSha}\n`
        + 'Scope: event storage, exact event page, shared staging sitemap.\nSHA-gated merge; no auto-merge setting.';
      if (number) {
        gh('pr', 'edit', String(number), '--repo', repository, '--title', title, '--body', body);
        if (!pull(number).draft) gh('pr', 'ready', String(number), '--repo', repository, '--undo');
      } else {
        gh('pr', 'create', '--repo', repository, '--draft', '--base', binding.contentRef, '--head', binding.branch,
          '--title', title, '--body', body);
      }
      const candidates = paged(`${endpoint}?state=open&base=${encodeURIComponent(binding.contentRef)}&per_page=100`)
        .filter(pr => pr.head.ref === binding.branch);
      if (candidates.length !== 1) throw new Error('Expected exactly one open FileMaker PR.');
      return candidates[0].number;
    },
    ready: async number => gh('pr', 'ready', String(number), '--repo', repository),
    merge: async (number, headSha) => JSON.parse(gh('api', '--method', 'PUT', `${endpoint}/${number}/merge`,
      '-f', 'merge_method=merge', '-f', `sha=${headSha}`)),
    verifyMerge: async (mergeSha, headSha) => {
      execute(repoRoot, 'git', ['fetch', '--no-tags', '--no-write-fetch-head', 'origin', mergeSha]);
      const parents = readGit(repoRoot, ['show', '-s', '--format=%P', mergeSha]).toString().trim();
      const tree = sha => readGit(repoRoot, ['rev-parse', `${sha}^{tree}`]).toString().trim();
      if (parents !== `${binding.contentSha} ${headSha}` || tree(mergeSha) !== tree(headSha)) {
        throw new Error('Content merge parent/tree mismatch; deployment blocked.');
      }
    },
    dispatch: async inputs => gh('workflow', 'run', 'docker-publish.yml', '--repo', repository, '--ref', 'main',
      '-f', `expected_sha=${inputs.expected_sha}`, '-f', `expected_content_sha=${inputs.expected_content_sha}`)
  };
}
