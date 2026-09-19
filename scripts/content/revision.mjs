import { bindContentEnvironment } from './environments.mjs';

export function assertGitSha(value, label) {
  if (typeof value !== 'string' || value.length !== 40 || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error(`${label}: vollständiger kleingeschriebener Git-SHA-1 erforderlich.`);
  }
  return value;
}

export function contentRevision({ environment, contentRef, codeSha, contentSha }) {
  const config = bindContentEnvironment(environment, contentRef);
  assertGitSha(codeSha, 'codeSha');
  assertGitSha(contentSha, 'contentSha');
  return Object.freeze({
    environment: config.environment,
    contentRef: config.contentRef,
    codeSha,
    contentSha,
    buildTarget: config.buildTarget,
    artifactId: `${config.environment}-code-${codeSha}-content-${contentSha}`
  });
}
