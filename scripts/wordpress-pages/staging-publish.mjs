import { BRANCH, PR_MARKER } from './contract.mjs';
import { findOwnedPr, verifyPr } from './staging-pr.mjs';

export async function publishStagingPages({ prepared, api, checkHeads, createCommit, push }) {
  const { revision, summary } = prepared;
  await checkHeads();
  const existing = await findOwnedPr(api, revision);
  const remote = await api(`git/ref/heads/${BRANCH}`, 'GET', undefined, true);
  const previousSha = remote?.object?.sha || '';
  if (existing && previousSha !== existing.head.sha) throw new Error('Automation branch differs from owned PR.');
  if (!existing && previousSha) {
    const history = await api.all('pulls?state=closed&base=content%2Fstaging&head=teuberleipzig-cpu%3A' + encodeURIComponent(BRANCH));
    const prior = history.find(pr => pr.head?.sha === previousSha);
    if (!prior) throw new Error('Unowned automation branch; manual reconciliation required.');
    await verifyPr(api, prior.number, revision, previousSha, { historical: true });
  }
  if (!summary.hasChanges) {
    if (existing) {
      await verifyPr(api, existing.number, revision, existing.head.sha);
      await checkHeads();
      await api(`pulls/${existing.number}`, 'PATCH', { state: 'closed' });
    }
    await checkHeads();
    return { action: existing ? 'closed-stale-own-draft' : 'no-change' };
  }
  await checkHeads();
  const headSha = await createCommit();
  await checkHeads();
  await push(headSha, previousSha);
  await checkHeads();
  const body = `${PR_MARKER}\n## WordPress Pages staging\n\nCode SHA: ${revision.codeSha}\nContent parent: ${revision.contentSha}\nGenerated head: ${headSha}\n\nOnly About/History. Human review required. No auto-merge or deployment.`;
  const payload = { title: 'Sync WordPress About and History to staging', body };
  const pr = existing
    ? await api(`pulls/${existing.number}`, 'PATCH', payload)
    : await api('pulls', 'POST', { ...payload, head: BRANCH, base: revision.contentRef, draft: true });
  await verifyPr(api, pr.number, revision, headSha);
  await checkHeads();
  return { action: existing ? 'updated-draft' : 'created-draft', number: pr.number, headSha };
}
