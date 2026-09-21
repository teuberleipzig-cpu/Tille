import { assertFresh, singleWriterPull, verifyWriterPull, deploymentInputs } from './staging-contract.mjs';
import { assertGitSha } from '../content/revision.mjs';

async function verifyFreshPull(io, binding, number, headSha, prepared) {
  const unique = singleWriterPull(binding, await io.pulls());
  if (!unique || unique.number !== number) throw new Error('Expected exactly one own open staging FileMaker PR.');
  verifyWriterPull({ binding, repository: io.repository, number, headSha,
    pull: await io.pull(number), files: await io.files(number), expectedFiles: prepared.changedFiles });
  await io.verifyHead(headSha, prepared.changedFiles);
  assertFresh(binding, await io.revisions());
}

// Side effects are explicit, injectable boundaries; tests never dispatch a real workflow.
export async function runStagingWriter({ binding, prepare, io }) {
  assertFresh(binding, await io.revisions());
  const prepared = await prepare();
  if (binding.mode === 'validate-only') return { action: 'validated', hasChanges: prepared.hasChanges };
  const existing = singleWriterPull(binding, await io.pulls());
  assertFresh(binding, await io.revisions());
  if (!prepared.hasChanges) {
    // Leave stale PR cleanup to a subsequent controlled operation. No-change has zero mutations.
    return { action: 'none', stalePr: existing?.number || null };
  }
  const previousHead = await io.branchHead(binding.branch);
  if (existing && (existing.head.sha !== previousHead || existing.head.repo?.full_name !== io.repository)) {
    throw new Error('Existing FileMaker PR/remote branch identity mismatch.');
  }
  const headSha = await io.commit(prepared);
  assertGitSha(headSha, 'headSha');
  assertFresh(binding, await io.revisions());
  await io.push(headSha, previousHead); // exact lease, content parent, never main
  const number = await io.draft(existing?.number, prepared);
  await verifyFreshPull(io, binding, number, headSha, prepared);
  await io.ready(number);
  await verifyFreshPull(io, binding, number, headSha, prepared);
  const merged = await io.merge(number, headSha);
  if (merged.merged !== true) throw new Error('GitHub did not merge the FileMaker PR.');
  assertGitSha(merged.sha, 'contentMergeSha');
  await io.verifyMerge(merged.sha, headSha);
  const inputs = deploymentInputs(binding, merged.sha, await io.revisions());
  await io.dispatch(inputs);
  return { action: 'merged', headSha, contentMergeSha: merged.sha, ...inputs };
}
