import { effectiveEventId, eventMonthKey } from '../../public/site/js/event-storage-model.js';

export const EVENT_SITE_URL = 'https://www.distillery.de';
export const EVENT_OUTPUT_ROOT = 'events';
export const EVENT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
export const EVENT_SOCIAL_IMAGE = `${EVENT_SITE_URL}/assets/social-preview.svg`;
export const EVENT_META_DESCRIPTION_MAX = 155;

const JSON_LD_ESCAPES = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
};

export function assertSafeEventId(value) {
  const id = String(value || '');
  if (!id || id === '.' || id === '..' || !EVENT_ID_PATTERN.test(id) || id.includes('/') || id.includes('\\') || id.includes('\0')) {
    throw new Error(`Unsichere Event-ID: ${JSON.stringify(id)}`);
  }
  let decoded;
  try { decoded = decodeURIComponent(id); } catch (_) { throw new Error(`Unsichere Event-ID: ${JSON.stringify(id)}`); }
  if (decoded !== id || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error(`Unsichere Event-ID: ${JSON.stringify(id)}`);
  }
  return id;
}

export function eventPublicUrl(id) {
  return `${EVENT_SITE_URL}/events/${assertSafeEventId(id)}/`;
}

export function eventOutputPath(id) {
  return `${EVENT_OUTPUT_ROOT}/${assertSafeEventId(id)}/index.html`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function truncateDescription(value) {
  if (value.length <= EVENT_META_DESCRIPTION_MAX) return value;
  const limit = EVENT_META_DESCRIPTION_MAX - 1;
  const candidate = value.slice(0, limit + 1);
  const boundary = candidate.lastIndexOf(' ');
  const cut = boundary >= Math.floor(limit * 0.65) ? boundary : limit;
  return `${value.slice(0, cut).trimEnd()}…`;
}

function eventLineup(event) {
  return (event.sections || [])
    .flatMap(section => (section.items || []).map(item => normalizeWhitespace(item.name)))
    .filter(Boolean);
}

function formatEventDate(date) {
  const value = String(date || '');
  if (!eventMonthKey(value)) throw new Error(`Ungültiges Event-Datum: ${value}`);
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export function eventMetaDescription(event) {
  const description = normalizeWhitespace(event.description);
  if (description) return truncateDescription(description);
  const title = normalizeWhitespace(event.title);
  const lineup = eventLineup(event).join(', ');
  const fallback = `${title} am ${formatEventDate(event.date)} in der Distillery Leipzig.${lineup ? ` ${lineup}` : ''}`;
  return truncateDescription(fallback);
}

function safeEventImage(value) {
  const image = String(value || '').trim();
  if (!image || /^(?:data|blob):/i.test(image) || image.includes('\0')) return null;
  const local = image.startsWith('/') ? image.slice(1) : image;
  if (local.startsWith('public/events/media/')) {
    const parts = local.split('/');
    if (parts.some(part => !part || part === '.' || part === '..') || !/^public\/events\/media\/[A-Za-z0-9._/-]+$/.test(local)) return null;
    return { display: image.startsWith('/') ? `/${local}` : local, absolute: `${EVENT_SITE_URL}/${local}` };
  }
  try {
    const url = new URL(image);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return { display: url.href, absolute: url.href };
  } catch (_) {
    return null;
  }
}

export function eventImageUrl(event) {
  return safeEventImage(event.imageUrl)?.absolute || EVENT_SOCIAL_IMAGE;
}

export function serializeEventJsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, character => JSON_LD_ESCAPES[character]);
}

export function eventJsonLd(event) {
  const id = assertSafeEventId(effectiveEventId(event));
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: normalizeWhitespace(event.title),
    startDate: String(event.date),
    url: eventPublicUrl(id),
    description: eventMetaDescription(event),
    image: eventImageUrl(event),
    location: {
      '@type': 'MusicVenue',
      name: 'Distillery Leipzig',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Eggebrechtstraße 2',
        postalCode: '04103',
        addressLocality: 'Leipzig',
        addressCountry: 'DE'
      }
    }
  };
}

function normalizeColor(value) {
  const color = value === 'blue' ? 'olive' : value;
  return ['orange', 'olive', 'yellow'].includes(color) ? color : 'olive';
}

function safeArtistLink(value) {
  const link = String(value || '').trim();
  if (!link || /^(?:data|blob|javascript):/i.test(link)) return '';
  try {
    const url = new URL(link);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) {
    return '';
  }
}

function renderArtist(item) {
  const name = escapeHtml(normalizeWhitespace(item.name));
  const link = safeArtistLink(item.link);
  const named = link ? `<a class="artist-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer"><strong>${name}</strong></a>` : `<strong>${name}</strong>`;
  const info = normalizeWhitespace(item.info);
  return `<span class="artist">${named}${info ? ` (${escapeHtml(info)})` : ''}</span>`;
}

function renderSections(event) {
  return (event.sections || []).map(section => {
    const label = normalizeWhitespace(section.label);
    const genre = normalizeWhitespace(section.genre);
    const items = (section.items || []).filter(item => normalizeWhitespace(item.name)).map(renderArtist).join(' ');
    if (!label && !genre && !items) return '';
    return `<section class="event-section">${label ? `<div class="label">${escapeHtml(label)}</div>` : ''}${genre ? `<div class="genre">${escapeHtml(genre)}</div>` : ''}${items ? `<div class="line">${items}</div>` : ''}</section>`;
  }).join('');
}

export function renderEventHtml(event) {
  const id = assertSafeEventId(effectiveEventId(event));
  const title = normalizeWhitespace(event.title);
  if (!title) throw new Error(`Event-Titel fehlt: ${id}`);
  const canonical = eventPublicUrl(id);
  const metaDescription = eventMetaDescription(event);
  const image = safeEventImage(event.imageUrl);
  const socialImage = image?.absolute || EVENT_SOCIAL_IMAGE;
  const displayDate = formatEventDate(event.date);
  const color = normalizeColor(event.color);
  const sections = renderSections(event);
  const description = String(event.description || '').trim();
  const pageTitle = `${title} – Distillery Leipzig`;
  const imageAlt = image ? `Eventbild: ${title}` : 'Distillery Leipzig – Dates, Residents, Club';
  const fallbackDimensions = image ? '' : '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">';
  const hero = image ? `<img class="event-hero" src="${escapeHtml(image.display)}" alt="${escapeHtml(imageAlt)}">\n` : '';
  const descriptionHtml = description ? `\n<div class="event-description">${escapeHtml(description)}</div>` : '';
  const jsonLd = serializeEventJsonLd(eventJsonLd(event));

  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../../">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(metaDescription)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="icon" href="/assets/distillery-d.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(metaDescription)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="Distillery Leipzig">
<meta property="og:image" content="${escapeHtml(socialImage)}">${fallbackDimensions}
<meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${escapeHtml(socialImage)}">
<script type="application/ld+json">${jsonLd}</script>
<style>
:root{--orange:#e49a78;--olive:#7b9ec8;--yellow:#e8cb7a;--grey:#d9d9d9}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#000;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.12}a{color:inherit;text-decoration:none}.page{width:800px;min-height:100vh;display:grid;grid-template-columns:606px 194px;background:#fff}.main{padding:18px 58px 14px 30px;background:#fff}.sidebar{background:#000;color:#fff;padding:93px 14px 14px 24px;min-height:100vh}.logo{width:280px;height:78px;margin:0 0 8px}.logo img{display:block;width:280px;height:78px;object-fit:contain}.nav{width:520px;margin-bottom:30px;font-size:13px;font-weight:900;text-transform:uppercase;line-height:1.13}.nav a{display:inline-block;padding:0 2px;margin:0 1px 3px 0;background:var(--grey);color:#000}.nav a:hover,.nav a.active{color:#fff;background:#000}.back-link{display:inline-block;margin-bottom:8px;padding:1px 3px;background:var(--grey);font-weight:700;line-height:1.25}.back-link:hover{background:#000;color:#fff}.event{max-width:518px}.event-hero{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;margin:0 0 14px}.event-title{margin:0 0 10px;font-size:18px;font-weight:900;line-height:1.02;text-transform:uppercase}.event-title span{box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 4px 0 0}.event-title.orange span{background:var(--orange)}.event-title.olive span{background:var(--olive)}.event-title.yellow span{background:var(--yellow)}.event-section{margin-top:4px}.label{margin-top:3px}.genre{font-style:italic}.line strong{font-size:16px;font-weight:900}.artist-link:hover{background:#000;color:#fff}.event-description{margin-top:18px;max-width:435px;line-height:1.22;white-space:pre-wrap}.footer{margin-top:92px;font-size:11px;font-weight:900;text-transform:uppercase}.footer small{display:block;margin-top:4px;font-size:10px;font-weight:400;text-transform:none}.footer a:hover{background:#000;color:#fff}@media(max-width:820px){.page{width:100%;grid-template-columns:1fr}.main{padding-right:24px}.sidebar{padding-top:24px;min-height:0}.nav{width:auto}}
</style>
<link rel="stylesheet" href="assets/mobile-navigation.css?v=mobile-navigation-7">
<link rel="stylesheet" href="assets/mobile-foundation.css?v=mobile-foundation-4">
</head>
<body data-site-page="dates">
<div class="page">
<main class="main">
<header class="logo" aria-label="Distillery"><img src="assets/distillery-logo.svg" alt="Distillery"></header>
<nav class="nav" aria-label="Hauptnavigation"><a class="active" href="index.html">Dates</a><a href="news.html">News</a><a href="residents.html">Residents</a><a href="about.html">About</a><a href="contact.html">Contact</a><a href="history.html">History</a><a href="feedback.html">Feedback</a><a href="gallery.html">Gallery</a></nav>
<a class="back-link" href="index.html?month=${escapeHtml(String(event.date).slice(0, 7))}">back to dates</a>
${hero}<article class="event">
<h1 class="event-title ${color}"><span class="event-date">${escapeHtml(displayDate)}</span> <span class="event-name">${escapeHtml(title)}</span></h1>
${sections}${descriptionHtml}
</article>
<footer class="footer">DISTILLERY LEIPZIG | EGGEBRECHTSTRAẞE 2 | 04103 LEIPZIG | <a href="mailto:club@distillery.de">club@distillery.de</a> | <a href="tel:+4934135597400">0341 35597400</a><small><a href="impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a></small></footer>
</main>
<aside class="sidebar" aria-hidden="true"></aside>
</div>
<script type="module" src="assets/site-navigation.js?v=site-navigation-8"></script>
<script src="assets/tracking.js?v=tracking-1" defer></script>
</body>
</html>
`;
}

function decodeXml(value) {
  return String(value).replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&amp;', '&');
}

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function sitemapLocation(block) {
  const match = /<loc>([\s\S]*?)<\/loc>/.exec(block);
  return match ? decodeXml(match[1].trim()) : '';
}

function isEventLocation(location) {
  return /^https:\/\/www\.distillery\.de\/events\/[A-Za-z0-9._-]+\/$/.test(location);
}

function eventSitemapBlock(location, eol) {
  return `<url>${eol}    <loc>${escapeXml(location)}</loc>${eol}  </url>`;
}

export function updateEventSitemap(existingXml, events) {
  const xml = String(existingXml || '');
  const eol = xml.includes('\r\n') ? '\r\n' : '\n';
  const matches = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)];
  if (!matches.length || !/<urlset\b/.test(xml) || !/<\/urlset>/.test(xml)) throw new Error('sitemap.xml ist ungültig oder enthält keine URL-Einträge.');
  const eventUrls = events.map(event => eventPublicUrl(effectiveEventId(event))).sort();
  if (new Set(eventUrls).size !== eventUrls.length) throw new Error('Kollision der Event-Sitemap-URLs.');
  const preserved = matches.map(match => match[0]).filter(block => !isEventLocation(sitemapLocation(block)));
  const generated = eventUrls.map(url => eventSitemapBlock(url, eol));
  const prefix = xml.slice(0, matches[0].index);
  const lastMatch = matches.at(-1);
  const suffix = xml.slice(lastMatch.index + lastMatch[0].length);
  return `${prefix}${[...preserved, ...generated].join(`${eol}  `)}${suffix}`;
}

export function eventSeoArtifacts(document, existingSitemap) {
  if (!document || !Array.isArray(document.events)) throw new Error('Event-Dokument events[] fehlt.');
  const seen = new Set();
  const outputKeys = new Map();
  const publicEvents = [];
  for (const event of document.events) {
    const id = assertSafeEventId(effectiveEventId(event));
    if (seen.has(id)) throw new Error(`Kollision der wirksamen Event-ID: ${id}`);
    seen.add(id);
    const outputKey = eventOutputPath(id).toLowerCase();
    if (outputKeys.has(outputKey)) throw new Error(`Kollision der Event-Outputpfade: ${outputKeys.get(outputKey)} / ${id}`);
    outputKeys.set(outputKey, id);
    if (event.status !== 'archived') publicEvents.push(event);
  }
  publicEvents.sort((a, b) => effectiveEventId(a) < effectiveEventId(b) ? -1 : effectiveEventId(a) > effectiveEventId(b) ? 1 : 0);
  const files = new Map();
  for (const event of publicEvents) files.set(eventOutputPath(effectiveEventId(event)), renderEventHtml(event));
  files.set('sitemap.xml', updateEventSitemap(existingSitemap, publicEvents));
  return { publicEvents, files };
}
