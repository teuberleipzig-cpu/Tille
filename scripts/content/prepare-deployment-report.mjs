import { readFileSync, appendFileSync } from 'node:fs';
import { verifyCompositionReport } from './deployment-report.mjs';

try {
  const report = verifyCompositionReport({ report: JSON.parse(readFileSync(process.env.COMPOSITION_REPORT, 'utf8')),
    output: process.env.COMPOSED_SITE, codeSha: process.env.CODE_SHA, contentSha: process.env.CONTENT_SHA });
  appendFileSync(process.env.GITHUB_OUTPUT, `artifact_id=${report.artifactId}\ncode_probe_sha256=${report.codeProbeSha256}\ncontent_probe_sha256=${report.contentProbeSha256}\n`);
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Composed staging revision\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
