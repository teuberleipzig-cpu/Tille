const SITE_URL = 'https://www.distillery.de';
const NEWS_URL = `${SITE_URL}/news/`;

const JSON_LD_ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

export function newsArticleUrl(slug) {
  return `${NEWS_URL}${slug}/`;
}

export function buildNewsArticleStructuredData(post) {
  const canonical = newsArticleUrl(post.slug);
  const organization = {
    '@type': 'Organization',
    name: 'Distillery Leipzig',
    url: `${SITE_URL}/`
  };
  const data = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt,
    url: canonical,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    },
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt || post.publishedAt,
    author: organization,
    publisher: organization
  };
  if (post.featuredImage?.url) data.image = [post.featuredImage.url];
  return data;
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => JSON_LD_ESCAPES[character]);
}

export function renderNewsArticleStructuredData(post) {
  return `<script type="application/ld+json">${serializeJsonLd(buildNewsArticleStructuredData(post))}</script>`;
}

function decodeXml(value) {
  return String(value)
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sitemapLocation(block) {
  const match = /<loc>([\s\S]*?)<\/loc>/.exec(block);
  return match ? decodeXml(match[1].trim()) : '';
}

function isManagedNewsLocation(location) {
  return location === NEWS_URL || /^https:\/\/www\.distillery\.de\/news\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(location);
}

function lastModifiedDate(post) {
  return String(post.modifiedAt || post.publishedAt).slice(0, 10);
}

function sitemapBlock(location, lastmod, eol) {
  return `<url>${eol}    <loc>${escapeXml(location)}</loc>${eol}    <lastmod>${escapeXml(lastmod)}</lastmod>${eol}  </url>`;
}

export function updateNewsSitemap(existingXml, posts) {
  const xml = String(existingXml || '');
  const eol = xml.includes('\r\n') ? '\r\n' : '\n';
  const matches = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)];
  if (!matches.length || !/<urlset\b/.test(xml) || !/<\/urlset>/.test(xml)) throw new Error('sitemap.xml ist ungültig oder enthält keine URL-Einträge.');

  const blocks = matches.map(match => ({ value: match[0], location: sitemapLocation(match[0]) }));
  const overviewIndexes = blocks.map((block, index) => block.location === NEWS_URL ? index : -1).filter(index => index >= 0);
  if (overviewIndexes.length !== 1) throw new Error('sitemap.xml muss genau einen News-Overview-Eintrag enthalten.');

  const sortedPosts = [...posts].sort((a, b) => a.slug.localeCompare(b.slug));
  const latest = sortedPosts.reduce((value, post) => {
    const date = lastModifiedDate(post);
    return date > value ? date : value;
  }, '');
  const overviewIndex = overviewIndexes[0];
  const outputBlocks = [];
  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (index === overviewIndex) {
      outputBlocks.push(latest ? sitemapBlock(NEWS_URL, latest, eol) : block.value);
      for (const post of sortedPosts) outputBlocks.push(sitemapBlock(newsArticleUrl(post.slug), lastModifiedDate(post), eol));
    } else if (!isManagedNewsLocation(block.location)) {
      outputBlocks.push(block.value);
    }
  }

  const prefix = xml.slice(0, matches[0].index);
  const lastMatch = matches.at(-1);
  const suffix = xml.slice(lastMatch.index + lastMatch[0].length);
  return `${prefix}${outputBlocks.join(`${eol}  `)}${suffix}`;
}
