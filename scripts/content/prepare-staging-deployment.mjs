import { readFileSync, appendFileSync } from 'node:fs';
import { bindStagingDeployment, assertNoLegacyContentWrite } from './deployment-binding.mjs';

try {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const revision = bindStagingDeployment({ eventName: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
    codeSha: process.env.CODE_SHA, actualCodeSha: process.env.ACTUAL_CODE_SHA,
    contentSha: process.env.CONTENT_SHA, inputs: event.inputs });
  if (process.env.GITHUB_EVENT_NAME === 'push') {
    if (event.after !== revision.codeSha || event.deleted || event.created) throw new Error('Invalid main push event.');
    assertNoLegacyContentWrite({ beforeSha: event.before, codeSha: revision.codeSha, forced: event.forced });
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `code_sha=${revision.codeSha}\ncontent_sha=${revision.contentSha}\n`);
  console.log(JSON.stringify(revision));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
