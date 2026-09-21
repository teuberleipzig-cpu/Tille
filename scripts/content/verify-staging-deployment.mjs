import { verifyStagingDeployment } from './staging-deployment-e2e.mjs';

try {
  const result = await verifyStagingDeployment({ codeHash: process.env.CODE_PROBE_SHA256,
    contentHash: process.env.CONTENT_PROBE_SHA256, runId: `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}` });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
