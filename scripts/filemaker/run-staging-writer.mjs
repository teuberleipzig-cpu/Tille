import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readGit } from '../content/git-snapshot.mjs';
import { parseFileMakerEventJson } from './filemaker-event-model.mjs';
import { bindWriter, writerEnvironment, assertFresh } from './staging-contract.mjs';
import { remoteRevisions, fetchBoundContent, githubWriterIO } from './staging-github.mjs';
import { prepareStagingWorkspace } from './staging-workspace.mjs';
import { runStagingWriter } from './staging-writer.mjs';

export async function main(env = process.env) {
  writerEnvironment(env.FILEMAKER_ENVIRONMENT, env.FILEMAKER_MODE);
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('FileMaker writer must use workflow_dispatch on main.');
  }
  const repoRoot = env.GITHUB_WORKSPACE;
  const codeSha = readGit(repoRoot, ['rev-parse', 'HEAD']).toString().trim();
  if (codeSha !== env.GITHUB_SHA || codeSha !== env.GITHUB_WORKFLOW_SHA) throw new Error('Workflow/code SHA mismatch.');
  const initial = remoteRevisions(repoRoot);
  let input;
  try { input = parseFileMakerEventJson(env.FILEMAKER_EVENT_JSON, env.FILEMAKER_OPERATION); }
  catch { throw new Error('Invalid FileMaker V1 payload or operation; check the documented field contract.'); }
  const binding = bindWriter({ environment: env.FILEMAKER_ENVIRONMENT, mode: env.FILEMAKER_MODE,
    codeSha, contentSha: initial.contentSha, eventId: input.id });
  assertFresh(binding, initial);
  fetchBoundContent(repoRoot, binding);
  if (!env.RUNNER_TEMP || !path.isAbsolute(env.RUNNER_TEMP)) throw new Error('RUNNER_TEMP is required.');
  const output = await mkdtemp(path.join(env.RUNNER_TEMP, 'filemaker-staging-'));
  const result = await runStagingWriter({ binding,
    prepare: async () => {
      try {
        return await prepareStagingWorkspace({ repoRoot, output, binding, operation: env.FILEMAKER_OPERATION,
          eventJson: env.FILEMAKER_EVENT_JSON });
      } catch { throw new Error('FileMaker composition/generation/scope validation failed; no content commit was created.'); }
    },
    io: githubWriterIO({ repoRoot, binding, repository: env.GITHUB_REPOSITORY }) });
  // Metadata only: never payloads, credentials, or generated content.
  console.log(JSON.stringify({ environment: binding.environment, codeSha, contentBaseSha: binding.contentSha, ...result }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => {
    // Payload/parser exceptions are sanitized at the boundary above.
    process.exitCode = 1;
    console.error(error.message);
  });
}
