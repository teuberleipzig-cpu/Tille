import { escapeHtml } from './html-sanitize.mjs';

const SITE_URL = 'https://www.distillery.de';
const FALLBACK_IMAGE = `${SITE_URL}/assets/social-preview.svg`;

function displayDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return `${day}.${month}.${year}`;
}

function shell({ title, description, canonical, content, depth = 0, ogImage = FALLBACK_IMAGE, ogType = 'website' }) {
  const prefix = '../'.repeat(depth);
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <base href="${prefix || './'}">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/assets/distillery-d.svg" type="image/svg+xml">
  <link rel="manifest" href="site.webmanifest">
  <meta name="theme-color" content="#000000">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Distillery Leipzig">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="stylesheet" href="assets/news.css?v=news-foundation-1">
  <style>.logo{margin-left:0}</style>
  <link rel="stylesheet" href="assets/mobile-navigation.css?v=mobile-navigation-5">
  <link rel="stylesheet" href="assets/mobile-foundation.css?v=mobile-foundation-4">
</head>
<body data-site-page="news">
  <div class="page">
    <main class="main">
      <header class="logo" aria-label="Distillery"><img src="assets/distillery-logo.svg" alt="Distillery"></header>
      <nav class="nav" aria-label="Hauptnavigation"><a href="index.html">Dates</a><a class="active" href="news.html">News</a><a href="residents.html">Residents</a><a href="about.html">About</a><a href="contact.html">Contact</a><a href="history.html">History</a><a href="feedback.html">Feedback</a></nav>
      ${content}
      <footer class="footer">DISTILLERY LEIPZIG | EGGEBRECHTSTRAẞE 2 | 04103 LEIPZIG | <a href="mailto:club@distillery.de">club@distillery.de</a> | <a href="tel:+4934135597400">0341 35597400</a><small><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a></small></footer>
    </main>
    <aside class="sidebar" aria-hidden="true"></aside>
  </div>
  <script type="module" src="assets/site-navigation.js?v=site-navigation-7"></script>
  <script src="assets/tracking.js?v=tracking-1" defer></script>
</body>
</html>
`;
}

export function renderOverview(posts, { depth = 0, articlePrefix = 'news/' } = {}) {
  const entries = posts.length ? posts.map(post => `<article class="news-card">
        ${post.featuredImage ? `<a class="news-card-image" href="${articlePrefix}${post.slug}/"><img src="${escapeHtml(post.featuredImage.url)}" alt="${escapeHtml(post.featuredImage.alt)}"></a>` : ''}
        <time datetime="${escapeHtml(post.publishedAt)}">${displayDate(post.publishedAt)}</time>
        <h2><a href="${articlePrefix}${post.slug}/">${escapeHtml(post.title)}</a></h2>
        ${post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : ''}
        <a class="news-more" href="${articlePrefix}${post.slug}/">Artikel lesen</a>
      </article>`).join('\n      ') : '<p class="news-empty">Noch keine News / keine veröffentlichten Beiträge.</p>';
  return shell({ title: 'Distillery – News', description: 'News und Updates der Distillery Leipzig.', canonical: `${SITE_URL}/news/`, depth, content: `<section class="news-content" aria-labelledby="news-title">
        <h1 id="news-title">News</h1>
        <div class="news-list">${entries}</div>
      </section>` });
}

export function renderArticle(post) {
  const canonical = `${SITE_URL}/news/${post.slug}/`;
  return shell({ title: `Distillery – ${post.title}`, description: post.excerpt || post.title, canonical, depth: 2, ogImage: post.featuredImage?.url || FALLBACK_IMAGE, ogType: 'article', content: `<article class="news-content news-article">
        <a class="news-back" href="news/">Zurück zu News</a>
        <h1>${escapeHtml(post.title)}</h1>
        <time datetime="${escapeHtml(post.publishedAt)}">${displayDate(post.publishedAt)}</time>
        ${post.featuredImage ? `<img class="news-hero" src="${escapeHtml(post.featuredImage.url)}" alt="${escapeHtml(post.featuredImage.alt)}">` : ''}
        <div class="news-body">${post.contentHtml}</div>
      </article>` });
}
