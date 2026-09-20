import { contentRevision, assertGitSha } from './revision.mjs';
import { readGit, readCommitSnapshot } from './git-snapshot.mjs';
import { classifyContentPath } from './content-scope.mjs';
import { replacementScope } from './replacement-scope.mjs';

export function bindStagingDeployment({ eventName, ref, codeSha, actualCodeSha, contentSha, inputs = {} }) {
  if (ref !== 'refs/heads/main') throw new Error('Staging deployment requires the main ref.');
  const revision = contentRevision({ environment: 'staging', contentRef: 'content/staging', codeSha, contentSha });
  if (actualCodeSha !== codeSha) throw new Error('Checked-out CODE SHA does not match the event SHA.');
  if (eventName === 'workflow_dispatch') {
    assertGitSha(inputs.expected_sha, 'expected_sha (CODE SHA)');
    assertGitSha(inputs.expected_content_sha, 'expected_content_sha');
    if (inputs.expected_sha !== codeSha) throw new Error('Expected CODE SHA mismatch.');
    if (inputs.expected_content_sha !== contentSha) throw new Error('Expected content/staging SHA mismatch; ref moved or wrong input.');
  } else if (eventName !== 'push') throw new Error('Unsupported deployment event.');
  return revision;
}

export function assertNoLegacyContentWrite({ repoRoot = process.cwd(), beforeSha, codeSha, forced = false }) {
  assertGitSha(beforeSha, 'push.before');
  assertGitSha(codeSha, 'push.after');
  if (forced || /^0+$/.test(beforeSha) || beforeSha === codeSha) throw new Error('Unreliable push baseline; deployment blocked.');
  readCommitSnapshot({ repoRoot, commitSha: beforeSha });
  readCommitSnapshot({ repoRoot, commitSha: codeSha });
  // A known before/after ancestry is mandatory, also for merge and multi-commit pushes.
  readGit(repoRoot, ['merge-base', '--is-ancestor', beforeSha, codeSha]);
  const raw = readGit(repoRoot, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', '--name-only', '-z', beforeSha, codeSha, '--']);
  const records = new TextDecoder('utf-8', { fatal: true }).decode(raw).split('\0');
  if (records.pop() !== '') throw new Error('Incomplete push diff.');
  const owns = replacementScope();
  for (const path of records) {
    const rule = classifyContentPath(path); // Ambiguous/noncanonical paths fail closed.
    if (owns(path) || (rule && rule.classification !== 'CODE')) {
      throw new Error('Legacy content write on main detected; writer must use content/staging.');
    }
  }
  return { changedFiles: records.length, valid: true };
}
