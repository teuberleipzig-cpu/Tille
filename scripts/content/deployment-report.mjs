import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { contentRevision, assertGitSha } from './revision.mjs';

export const DEPLOYMENT_PROBES = Object.freeze({ code: 'index.html', content: 'public/events/data/manifest.json' });
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function verifyCompositionReport({ report, codeSha, contentSha, output }) {
  const revision = contentRevision({ environment: 'staging', contentRef: 'content/staging', codeSha, contentSha });
  for (const key of ['environment', 'contentRef', 'codeSha', 'contentSha', 'artifactId']) {
    if (report[key] !== revision[key]) throw new Error(`Composition report mismatch: ${key}.`);
  }
  assertGitSha(report.contentTreeSha, 'contentTreeSha');
  if (report.valid !== true || !Number.isInteger(report.contentFileCount) || report.contentFileCount < 1) {
    throw new Error('Composition report is not valid.');
  }
  return { ...revision, contentTreeSha: report.contentTreeSha,
    codeProbeSha256: sha256(readFileSync(path.join(output, DEPLOYMENT_PROBES.code))),
    contentProbeSha256: sha256(readFileSync(path.join(output, DEPLOYMENT_PROBES.content))) };
}
