import { plainTextFromHtml, sanitizeHtml } from '../news/html-sanitize.mjs';
import { assertNewsOutputContentSafe } from '../news/news-sync.mjs';

export function normalizePage(page, expectedId, baseUrl) {
  if (!page || Array.isArray(page) || typeof page !== 'object' || page.id !== expectedId ||
      !Number.isSafeInteger(page.id) || page.id <= 0 || page.status !== 'publish' ||
      typeof page.title?.rendered !== 'string' || typeof page.content?.rendered !== 'string' || page.content.protected === true) {
    throw new Error('WordPress Page must match the configured ID and be publicly published.');
  }
  // The shared News sanitizer strips H1; reject it BEFORE that information is lost.
  if (/<\s*\/?\s*h1\b/i.test(page.content.rendered)) throw new Error('WordPress content must not contain H1; the template owns H1.');
  const title = plainTextFromHtml(page.title.rendered);
  const contentHtml = sanitizeHtml(page.content.rendered, { blockedAnchorOrigins: [baseUrl] }).trim();
  if (!title || (!plainTextFromHtml(contentHtml) && !/<img\s[^>]*src="https?:\/\//i.test(contentHtml))) {
    throw new Error('WordPress Page title/editorial content must not be empty.');
  }
  assertNewsOutputContentSafe(new Map([['page fragment', contentHtml]]));
  let modifiedAt = '';
  if (page.modified !== undefined) {
    if (typeof page.modified !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(page.modified) ||
        !Number.isFinite(Date.parse(page.modified + 'Z')) || new Date(page.modified + 'Z').toISOString().slice(0, 19) !== page.modified) {
      throw new Error('Invalid WordPress Page modified timestamp.');
    }
    modifiedAt = page.modified;
  }
  return Object.freeze({ sourceId: page.id, status: page.status, title, contentHtml, modifiedAt });
}
