import { resolveEnvironment } from '../content/environments.mjs';
import { contentRevision } from '../content/revision.mjs';
import { validateContentChanges } from '../content/content-scope.mjs';
import { assertAllowedNewsOutputPaths } from './news-sync.mjs';

export const REPOSITORY = 'teuberleipzig-cpu/Tille';
export const BRANCH = 'automation/wordpress-news/staging';
export const PR_MARKER = '<!-- tille:wordpress-news-sync:staging:v1 -->';
export function stagingEnvironment(environment) {
  const config = resolveEnvironment(environment);
  if (config.environment !== 'staging') throw new Error('Live WordPress publishing is not activated yet.');
  return config;
}
export function stagingRevision({ environment, codeSha, contentSha }) {
  const config = stagingEnvironment(environment);
  return contentRevision({ environment, contentRef: config.contentRef, codeSha, contentSha });
}
export function assertNewsScope(paths) {
  const result = validateContentChanges({ environment: 'staging', contentRef: 'content/staging', paths });
  if (!result.valid) throw new Error('News output contains CODE, UNKNOWN or invalid content paths.');
  assertAllowedNewsOutputPaths(paths);
}
export function assertSharedSitemap(before, after) {
  const unmanaged = xml => [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m => m[0]).filter(block =>
    !/<loc>https:\/\/www\.distillery\.de\/news\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)?<\/loc>/.test(block));
  if (JSON.stringify(unmanaged(before)) !== JSON.stringify(unmanaged(after))) {
    throw new Error('News sync changed non-News sitemap blocks.');
  }
}
