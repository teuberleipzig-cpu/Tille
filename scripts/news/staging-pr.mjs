import { assertGitSha } from '../content/revision.mjs';
import { REPOSITORY, BRANCH, PR_MARKER, assertNewsScope } from './staging-contract.mjs';

export function assertOwnedPr(pr, revision, headSha, { historical = false } = {}) {
  if (!pr || pr.state !== (historical ? 'closed' : 'open') || (!historical && !pr.draft) || pr.auto_merge != null ||
      pr.base?.repo?.full_name !== REPOSITORY || pr.head?.repo?.full_name !== REPOSITORY ||
      pr.base?.ref !== 'content/staging' || pr.head?.ref !== BRANCH ||
      pr.user?.login !== 'github-actions[bot]' || !pr.body?.startsWith(PR_MARKER)) {
    throw new Error('Not an owned open Draft WordPress staging PR; refusing mutation.');
  }
  if (!historical && pr.base.sha !== revision.contentSha) throw new Error('PR base SHA moved; rerun required.');
  if (pr.head.sha !== assertGitSha(headSha, 'headSha')) throw new Error('PR head SHA mismatch.');
}
export async function verifyPr(api, number, revision, headSha, options) {
  const pr = await api(`pulls/${number}`);
  assertOwnedPr(pr, revision, headSha, options);
  if (!Number.isInteger(pr.changed_files) || pr.changed_files > 3000) throw new Error('PR file list cannot be verified completely.');
  const files = await api.all(`pulls/${number}/files`);
  if (files.some(file => file.status === 'renamed' && !file.previous_filename)) throw new Error('Rename origin missing from PR file list.');
  if (files.length !== pr.changed_files || new Set(files.map(f => f.filename)).size !== files.length) throw new Error('Incomplete/duplicate PR file list.');
  assertNewsScope(files.flatMap(file => [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])]));
  const fresh = await api(`pulls/${number}`);
  assertOwnedPr(fresh, revision, headSha, options);
  if (fresh.changed_files !== pr.changed_files) throw new Error('PR changed during verification.');
  return fresh;
}
export async function findOwnedPr(api, revision) {
  const pulls = await api.all('pulls?state=open&base=content%2Fstaging');
  const candidates = pulls.filter(pr => pr.head?.ref?.startsWith('automation/wordpress-news') || pr.body?.includes(PR_MARKER));
  if (candidates.length > 1) throw new Error('Multiple WordPress staging PRs are open.');
  if (!candidates.length) return null;
  const pr = candidates[0];
  return verifyPr(api, pr.number, revision, pr.head.sha);
}
export function createGitHubApi(token, fetcher = globalThis.fetch) {
  if (!token) throw new Error('GitHub token required for sync-pr.');
  async function api(path, method = 'GET', body, allowMissing = false) {
    let response;
    try {
      response = await fetcher(`https://api.github.com/repos/${REPOSITORY}/${path}`, {
        method, redirect: 'error', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    } catch { throw new Error('GitHub request failed; no automatic retry.'); }
    if (allowMissing && response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ${method} failed (HTTP ${response.status}); no automatic retry.`);
    return response.json();
  }
  api.all = async path => {
    const result = [];
    for (let page = 1; ; page++) {
      const items = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(items)) throw new Error('Invalid paginated GitHub response.');
      result.push(...items);
      if (items.length < 100) return result;
    }
  };
  return api;
}
