import { resolveEnvironment } from '../content/environments.mjs';
import { contentRevision, assertGitSha } from '../content/revision.mjs';
import { validateContentChanges } from '../content/content-scope.mjs';
import { normalizeFileMakerId } from './filemaker-event-model.mjs';
import { assertAllowedFileMakerOutputPaths } from './filemaker-event-intake.mjs';

export const STAGING_PREFIX = 'automation/filemaker-event/staging/';

export function writerEnvironment(environment, mode) {
  const config = resolveEnvironment(environment);
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error('Unsupported FileMaker mode.');
  if (config.environment === 'live') throw new Error('Live FileMaker publishing is not activated yet.');
  return config;
}

export function bindWriter({ environment, mode, codeSha, contentSha, eventId }) {
  const config = writerEnvironment(environment, mode);
  const id = normalizeFileMakerId(eventId);
  return Object.freeze({ ...contentRevision({ ...config, codeSha, contentSha }), mode, eventId: id,
    branch: `${STAGING_PREFIX}${id}` });
}

export function assertFresh(binding, current, contentSha = binding.contentSha) {
  if (current.codeSha !== binding.codeSha) throw new Error('main moved during FileMaker intake; rerun required.');
  if (current.contentSha !== contentSha) throw new Error('content/staging moved during FileMaker intake; rerun required.');
}

export function assertWriterPaths(binding, paths) {
  const result = validateContentChanges({ ...binding, paths });
  if (!result.valid) throw new Error('FileMaker output contains CODE, UNKNOWN or invalid paths.');
  assertAllowedFileMakerOutputPaths(paths, binding.eventId);
}

export function singleWriterPull(binding, pulls) {
  const relevant = pulls.filter(pr => pr.base.ref === binding.contentRef && pr.head.ref.startsWith(STAGING_PREFIX));
  if (relevant.length > 1) throw new Error('More than one staging FileMaker PR is open.');
  if (relevant[0] && relevant[0].head.ref !== binding.branch) throw new Error('Another staging FileMaker event PR is open.');
  return relevant[0] || null;
}

export function verifyWriterPull({ binding, repository, number, headSha, pull, files, expectedFiles }) {
  assertGitSha(headSha, 'headSha');
  if (binding.environment !== 'staging' || binding.branch !== `${STAGING_PREFIX}${normalizeFileMakerId(binding.eventId)}`) {
    throw new Error('FileMaker environment/event branch mismatch.');
  }
  if (!Number.isSafeInteger(number) || number < 1 || pull.number !== number || pull.state !== 'open'
      || pull.base.ref !== binding.contentRef || pull.base.sha !== binding.contentSha
      || pull.head.ref !== binding.branch || pull.head.sha !== headSha
      || pull.base.repo?.full_name !== repository || pull.head.repo?.full_name !== repository) {
    throw new Error('FileMaker PR number/state/repository/base/head/revision mismatch.');
  }
  if (pull.auto_merge) throw new Error('FileMaker PR must not have auto-merge enabled.');
  if (!files.length || pull.changed_files !== files.length) throw new Error('Incomplete FileMaker PR files.');
  // A rename must not smuggle a deletion outside the allowed operation scope.
  assertWriterPaths(binding, files.flatMap(file => [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])]));
  const names = files.map(file => file.filename);
  const actual = [...new Set(files.flatMap(file => [file.filename, ...(file.previous_filename ? [file.previous_filename] : [])]))].sort();
  if (new Set(names).size !== names.length || JSON.stringify(actual) !== JSON.stringify([...expectedFiles].sort())) {
    throw new Error('FileMaker PR files differ from the generated content commit.');
  }
}

export function deploymentInputs(binding, mergeSha, current) {
  assertGitSha(mergeSha, 'contentMergeSha');
  assertFresh(binding, current, mergeSha);
  return { expected_sha: binding.codeSha, expected_content_sha: mergeSha };
}
