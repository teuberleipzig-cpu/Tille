import { decodeHtmlEntities, plainTextFromHtml, safeHttpUrl, sanitizeHtml } from './html-sanitize.mjs';

export const EXCERPT_LIMIT = 180;

function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }

function normalizeDate(value, field) {
  const raw = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:?\d{2})?$/.test(raw) || Number.isNaN(Date.parse(raw.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw}Z`))) {
    throw new Error(`Ungültiges WordPress-Datum in ${field}.`);
  }
  return raw;
}

function validateSlug(value) {
  const slug = clean(value);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Unsicherer News-Slug: ${slug || '(leer)'}`);
  return slug;
}

function taxonomyNames(post, taxonomy) {
  const values = post?._embedded?.['wp:term']?.flat?.() || [];
  return [...new Set(values.filter(item => item?.taxonomy === taxonomy).map(item => clean(decodeHtmlEntities(item.name))).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
}

function featuredImage(post) {
  const media = post?._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return null;
  const url = safeHttpUrl(media.source_url);
  if (!url) return null;
  return { url, alt: clean(decodeHtmlEntities(media.alt_text)) };
}

function truncate(text, limit = EXCERPT_LIMIT) {
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit + 1);
  const end = slice.lastIndexOf(' ');
  return `${slice.slice(0, end > limit / 2 ? end : limit).trim()}…`;
}

export function normalizeWordPressPost(post, { sourceOrigin = '' } = {}) {
  if (!post || typeof post !== 'object' || Array.isArray(post)) throw new Error('WordPress-Post ist ungültig.');
  if (!Number.isSafeInteger(post.id) || post.id <= 0) throw new Error('WordPress-Post-ID ist ungültig.');
  const contentHtml = sanitizeHtml(post.content?.rendered || '', { blockedAnchorOrigins: sourceOrigin ? [sourceOrigin] : [] });
  const title = clean(decodeHtmlEntities(plainTextFromHtml(post.title?.rendered || '')));
  if (!title) throw new Error(`WordPress-Post ${post.id} hat keinen Titel.`);
  const suppliedExcerpt = plainTextFromHtml(post.excerpt?.rendered || '');
  const excerpt = truncate(suppliedExcerpt || plainTextFromHtml(contentHtml));
  return {
    sourceId: post.id,
    slug: validateSlug(post.slug),
    status: post.status,
    title,
    excerpt,
    contentHtml,
    publishedAt: normalizeDate(post.date, 'date'),
    modifiedAt: post.modified ? normalizeDate(post.modified, 'modified') : '',
    featuredImage: featuredImage(post),
    categories: taxonomyNames(post, 'category'),
    tags: taxonomyNames(post, 'post_tag')
  };
}

export function normalizeWordPressPosts(posts, options = {}) {
  if (!Array.isArray(posts)) throw new Error('WordPress-Response muss ein Array sein.');
  const published = posts.filter(post => post?.status === 'publish').map(post => normalizeWordPressPost(post, options));
  const ids = new Set(), slugs = new Set();
  for (const post of published) {
    if (ids.has(post.sourceId)) throw new Error(`Doppelte WordPress-ID: ${post.sourceId}`);
    if (slugs.has(post.slug)) throw new Error(`Doppelter News-Slug: ${post.slug}`);
    ids.add(post.sourceId); slugs.add(post.slug);
  }
  return published.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug) || a.sourceId - b.sourceId);
}
