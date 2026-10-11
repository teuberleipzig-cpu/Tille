import { assertGitSha } from '../content/revision.mjs';
import { REPOSITORY, BRANCH, PR_MARKER, assertPagesScope } from './contract.mjs';

export function assertOwnedPr(pr, revision, headSha, { historical = false } = {}) {
  if (!pr || pr.state !== (historical ? 'closed' : 'open') || (!historical && !pr.draft) || pr.auto_merge != null ||
      pr.base?.repo?.full_name !== REPOSITORY || pr.head?.repo?.full_name !== REPOSITORY ||
      pr.base?.ref !== 'content/staging' || pr.head?.ref !== BRANCH ||
      pr.user?.login !== 'github-actions[bot]' || !pr.body?.startsWith(PR_MARKER)) {
    throw new Error('Not an owned WordPress Pages Draft PR; refusing mutation.');
  }
  if (!historical && pr.base.sha !== revision.contentSha) throw new Error('PR base SHA moved.');
  if (pr.head.sha !== assertGitSha(headSha, 'headSha')) throw new Error('PR head SHA mismatch.');
}
export async function verifyPr(api, number, revision, headSha, options) {
  const pr = await api(`pulls/${number}`);
  assertOwnedPr(pr, revision, headSha, options);
  if (!Number.isInteger(pr.changed_files) || pr.changed_files < 0 || pr.changed_files > 2) throw new Error('Invalid Pages PR file count.');
  const files = await api.all(`pulls/${number}/files`);
  if (files.length !== pr.changed_files || new Set(files.map(file => file.filename)).size !== files.length ||
      files.some(file => !['added', 'modified'].includes(file.status) || file.previous_filename)) {
    throw new Error('Incomplete, renamed, deleted or duplicate Pages PR file list.');
  }
  assertPagesScope(files.map(file => file.filename));
  const fresh = await api(`pulls/${number}`);
  assertOwnedPr(fresh, revision, headSha, options);
  if (fresh.changed_files !== pr.changed_files) throw new Error('PR changed during verification.');
  return fresh;
}
export async function findOwnedPr(api, revision) {
  const pulls = await api.all('pulls?state=open');
  const candidates = pulls.filter(pr => pr.head?.ref?.startsWith('automation/wordpress-pages') || pr.body?.includes(PR_MARKER));
  if (candidates.length > 1) throw new Error('Multiple Pages automation PRs.');
  if (!candidates.length) return null;
  return verifyPr(api, candidates[0].number, revision, candidates[0].head.sha);
}
