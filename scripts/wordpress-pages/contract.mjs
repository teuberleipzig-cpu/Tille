import { stagingEnvironment, stagingRevision } from '../news/staging-contract.mjs';
import { validateWordPressBaseUrl } from '../news/news-sync.mjs';
import { validateContentChanges } from '../content/content-scope.mjs';

export { stagingEnvironment, stagingRevision };
export const REPOSITORY = 'teuberleipzig-cpu/Tille';
export const BRANCH = 'automation/wordpress-pages/staging';
export const PR_MARKER = '<!-- tille:wordpress-pages-sync:staging:v1 -->';
export const PAGE_PATHS = Object.freeze(['about.html', 'history.html']);

function pageId(value, name) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) || String(value) !== String(Number(value))) throw new Error(`${name} must be a positive safe integer.`);
  return Number(value);
}
export function pagesConfig({ environment, wordpressBaseUrl, aboutPageId, historyPageId }) {
  stagingEnvironment(environment);
  const baseUrl = validateWordPressBaseUrl(wordpressBaseUrl);
  const about = pageId(aboutPageId, 'WORDPRESS_ABOUT_PAGE_ID');
  const history = pageId(historyPageId, 'WORDPRESS_HISTORY_PAGE_ID');
  if (about === history) throw new Error('About and History Page IDs must differ.');
  return Object.freeze({ baseUrl, about, history });
}
export function assertPagesScope(paths) {
  const scope = validateContentChanges({ environment: 'staging', contentRef: 'content/staging', paths });
  if (!scope.valid || paths.some(file => !PAGE_PATHS.includes(file)) || new Set(paths).size !== paths.length) {
    throw new Error('Pages output must contain only distinct about.html/history.html paths.');
  }
}
