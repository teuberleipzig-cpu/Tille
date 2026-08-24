export const RESIDENT_SITE_URL = 'https://www.distillery.de';
export const RESIDENT_OUTPUT_ROOT = 'residents';
export const RESIDENT_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
export const RESIDENT_SOCIAL_IMAGE = `${RESIDENT_SITE_URL}/assets/social-preview.svg`;
export const RESIDENT_META_DESCRIPTION_MAX = 155;
const PUBLIC_RESIDENT = Symbol('publicResidentProjection');

export function assertSafeResidentId(value) {
  const id = String(value || '');
  if (!id || id === '.' || id === '..' || !RESIDENT_ID_PATTERN.test(id) || id.includes('/') || id.includes('\\') || id.includes('\0')) {
    throw new Error(`Unsichere Resident-ID: ${JSON.stringify(id)}`);
  }
  let decoded;
  try { decoded = decodeURIComponent(id); } catch (_) { throw new Error(`Unsichere Resident-ID: ${JSON.stringify(id)}`); }
  if (decoded !== id || decoded === '.' || decoded === '..' || decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error(`Unsichere Resident-ID: ${JSON.stringify(id)}`);
  }
  return id;
}

export function residentPublicUrl(id) {
  return `${RESIDENT_SITE_URL}/residents/${assertSafeResidentId(id)}/`;
}

export function residentOutputPath(id) {
  return `${RESIDENT_OUTPUT_ROOT}/${assertSafeResidentId(id)}/index.html`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function cleanList(value) {
  const input = Array.isArray(value) ? value : String(value ?? '').split(/\n|,/);
  return input.map(item => {
    if (typeof item === 'string' || typeof item === 'number') return normalizeWhitespace(item);
    if (item && typeof item === 'object') return normalizeWhitespace(item.title || item.name);
    return '';
  }).filter(Boolean);
}

function firstText(...values) {
  for (const value of values) {
    const text = normalizeWhitespace(value);
    if (text) return text;
  }
  return '';
}

function mediaValue(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value.url || value.src || value.imageUrl || value.coverUrl || value.coverImage || value.path || '';
}

function safeExternalUrl(value) {
  const text = String(value || '').trim();
  if (!text || /^(?:data|blob|javascript):/i.test(text) || text.includes('\0')) return '';
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch (_) {
    return '';
  }
}

function normalizeLocalResidentPath(value) {
  let local = String(value || '').trim();
  if (local.startsWith('/Tille/public/')) local = local.slice('/Tille/'.length);
  else if (local.startsWith('/public/')) local = local.slice(1);
  else if (local.startsWith('/residents/media/')) local = `public${local}`;
  else if (local.startsWith('residents/media/')) local = `public/${local}`;
  if (!local.startsWith('public/residents/media/')) return '';
  const parts = local.split('/');
  if (parts.some(part => !part || part === '.' || part === '..') || !/^public\/residents\/media\/[A-Za-z0-9._/-]+$/.test(local)) return '';
  return local;
}

function safeResidentResource(value) {
  const text = String(mediaValue(value) || '').trim();
  if (!text || /^(?:data|blob|javascript):/i.test(text) || text.includes('\0')) return null;
  const local = normalizeLocalResidentPath(text);
  if (local) return { display: local, absolute: `${RESIDENT_SITE_URL}/${local}` };
  const external = safeExternalUrl(text);
  return external ? { display: external, absolute: external } : null;
}

function safeEmail(value) {
  const email = String(value || '').trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : '';
}

function firstSafeResource(...values) {
  for (const value of values) {
    const resource = safeResidentResource(value);
    if (resource) return resource;
  }
  return null;
}

function safeResourceList(value) {
  if (!Array.isArray(value)) return [];
  return value.map(safeResidentResource).filter(Boolean);
}

function socialLinks(resident) {
  const definitions = [
    ['Instagram', resident.instagram || resident.instagramUrl || resident.instagramLink],
    ['Resident Advisor', resident.residentadvisor || resident.residentAdvisor || resident.ra || resident.raUrl || resident.residentAdvisorUrl],
    ['Discogs', resident.discogs || resident.discogsUrl],
    ['Beatport', resident.beatport || resident.beatportUrl],
    ['Bandcamp', resident.bandcamp || resident.bandcampUrl],
    ['SoundCloud', resident.soundcloud || resident.soundcloudUrl || resident.soundcloudLink]
  ];
  return definitions.map(([label, value]) => ({ label, url: safeExternalUrl(value) })).filter(item => item.url);
}

function releaseTracks(release) {
  if (Array.isArray(release.trackDetails) && release.trackDetails.length) return cleanList(release.trackDetails);
  return cleanList(release.tracks);
}

function publishedReleases(resident) {
  const input = Array.isArray(resident.releases) ? resident.releases : [];
  const manual = input.some(release => release?.sortOrder !== undefined && release?.sortOrder !== null && release?.sortOrder !== '');
  return input.map((release, index) => ({ release, index })).filter(({ release }) =>
    release && release.published !== false && (normalizeWhitespace(release.title) || normalizeWhitespace(release.releaseDate) || normalizeWhitespace(release.label))
  ).sort((a, b) => {
    if (manual) return (Number(a.release.sortOrder ?? a.index) - Number(b.release.sortOrder ?? b.index)) || a.index - b.index;
    return (Number(Boolean(b.release.featured)) - Number(Boolean(a.release.featured)))
      || String(b.release.releaseDate || b.release.year || '').localeCompare(String(a.release.releaseDate || a.release.year || ''))
      || String(a.release.title || '').localeCompare(String(b.release.title || ''), 'de')
      || a.index - b.index;
  }).map(({ release }) => ({
    title: normalizeWhitespace(release.title),
    releaseDate: normalizeWhitespace(release.releaseDate || release.date),
    year: normalizeWhitespace(release.year),
    label: normalizeWhitespace(release.label),
    releaseType: normalizeWhitespace(release.releaseType),
    format: normalizeWhitespace(release.format),
    country: normalizeWhitespace(release.country),
    artists: cleanList(release.artists),
    tracks: releaseTracks(release),
    description: normalizeWhitespace(release.description),
    cover: firstSafeResource(release.coverImage, release.coverUrl, release.cover, release.imageUrl),
    links: [
      ['Discogs', release.discogsUrl], ['Beatport', release.beatportUrl], ['Bandcamp', release.bandcampUrl], ['Label', release.labelUrl]
    ].map(([label, value]) => ({ label, url: safeExternalUrl(value) })).filter(item => item.url),
    autoNewsText: normalizeWhitespace(release.autoNewsText)
  }));
}

export function projectPublicResident(resident) {
  if (!resident || typeof resident !== 'object' || Array.isArray(resident)) throw new Error('Resident-Datensatz ist ungültig.');
  const id = assertSafeResidentId(resident.id);
  const name = normalizeWhitespace(resident.name);
  if (!name) throw new Error(`Resident-Name fehlt: ${id}`);
  const photoList = safeResourceList(resident.photoList);
  const photos = photoList.length ? photoList : safeResourceList(resident.photos);
  const fallbackImage = photos.length ? null : safeResidentResource(resident.imageUrl);
  const releases = publishedReleases(resident);
  const manualNews = (Array.isArray(resident.newsItems) ? resident.newsItems : []).map(item => ({
    date: normalizeWhitespace(item?.date), text: normalizeWhitespace(item?.text)
  })).filter(item => item.date && item.text);
  const releaseNews = releases.filter(release => release.releaseDate && release.title).map(release => ({
    date: release.releaseDate, text: release.autoNewsText || `${release.title} Release`
  }));
  const newsItems = [...manualNews, ...releaseNews].sort((a, b) =>
    b.date.localeCompare(a.date) || a.text.localeCompare(b.text, 'de')
  );
  const projected = {
    id,
    name,
    city: normalizeWhitespace(resident.city),
    genre: normalizeWhitespace(resident.genre),
    labels: cleanList(resident.labels),
    relatedProjects: cleanList(resident.relatedProjects),
    pressText: normalizeWhitespace(resident.pressText),
    bio: normalizeWhitespace(resident.bio),
    photos: fallbackImage ? [fallbackImage] : photos,
    socials: socialLinks(resident),
    bookingEmail: safeEmail(resident.bookingEmail),
    presskit: firstSafeResource(resident.presskitUrl, resident.presskit),
    news: normalizeWhitespace(resident.news),
    newsItems,
    releases
  };
  Object.defineProperty(projected, PUBLIC_RESIDENT, { value: true });
  return projected;
}

function truncateDescription(value) {
  if (value.length <= RESIDENT_META_DESCRIPTION_MAX) return value;
  const limit = RESIDENT_META_DESCRIPTION_MAX - 1;
  const candidate = value.slice(0, limit + 1);
  const boundary = candidate.lastIndexOf(' ');
  const cut = boundary >= Math.floor(limit * 0.65) ? boundary : limit;
  return `${value.slice(0, cut).trimEnd()}…`;
}

export function residentMetaDescription(resident) {
  const projected = resident?.[PUBLIC_RESIDENT] ? resident : projectPublicResident(resident);
  const source = projected.pressText || projected.bio || [
    `${projected.name} ist Resident der Distillery Leipzig.`,
    projected.genre ? `Genre: ${projected.genre}.` : '',
    projected.city ? `Aus ${projected.city}.` : ''
  ].filter(Boolean).join(' ');
  return truncateDescription(normalizeWhitespace(source));
}

export function residentImage(resident) {
  const projected = resident?.[PUBLIC_RESIDENT] ? resident : projectPublicResident(resident);
  return projected.photos[0]?.absolute || RESIDENT_SOCIAL_IMAGE;
}

function renderFact(label, value) {
  const text = Array.isArray(value) ? value.join(', ') : value;
  return text ? `<div class="fact"><b>${escapeHtml(label)}</b><span>${escapeHtml(text)}</span></div>` : '';
}

function renderPhotos(resident) {
  if (!resident.photos.length) return '<div class="hero-placeholder">Kein Foto</div>';
  return `<section class="resident-photos" aria-label="Fotos von ${escapeHtml(resident.name)}">${resident.photos.map((photo, index) => `<img src="${escapeHtml(photo.display)}" alt="${escapeHtml(resident.name)}${resident.photos.length > 1 ? ` – Foto ${index + 1}` : ''}"${index ? ' loading="lazy"' : ''}>`).join('')}</section>`;
}

function renderSocials(resident) {
  if (!resident.socials.length) return '';
  return `<div class="socials" aria-label="Öffentliche Profile">${resident.socials.map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}</div>`;
}

function renderActions(resident) {
  const actions = [];
  if (resident.bookingEmail) actions.push(`<a class="button" href="mailto:${escapeHtml(resident.bookingEmail)}">Booking</a>`);
  if (resident.presskit) actions.push(`<a class="button" href="${escapeHtml(resident.presskit.display)}" target="_blank" rel="noopener noreferrer">Presskit</a>`);
  return actions.length ? `<div class="actions">${actions.join('')}</div>` : '';
}

function renderNews(resident) {
  const items = resident.newsItems;
  if (!items.length && !resident.news) return '';
  const entries = items.length ? items.map(item => `<article class="news-entry"><time datetime="${escapeHtml(item.date)}">${escapeHtml(item.date)}</time><span>${escapeHtml(item.text)}</span></article>`).join('') : `<p>${escapeHtml(resident.news)}</p>`;
  return `<section class="profile-section"><h2>News</h2><div class="news-list">${entries}</div></section>`;
}

function renderRelease(release) {
  const facts = [
    ['Release', release.releaseDate || release.year], ['Label', release.label], ['Type', release.releaseType],
    ['Format', release.format], ['Country', release.country], ['Artists', release.artists], ['Tracks', release.tracks]
  ].map(([label, value]) => renderFact(label, value)).join('');
  const links = release.links.length ? `<div class="release-links">${release.links.map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join(' / ')}</div>` : '';
  const cover = release.cover ? `<img class="release-cover" src="${escapeHtml(release.cover.display)}" alt="${escapeHtml(release.title || 'Release Cover')}" loading="lazy">` : '<div class="release-cover release-cover-placeholder">Cover</div>';
  return `<article class="release-row">${cover}<div class="release-body"><h3>${escapeHtml(release.title || 'Ohne Titel')}</h3>${facts}${release.description ? `<p>${escapeHtml(release.description)}</p>` : ''}${links}</div></article>`;
}

function renderReleases(resident) {
  if (!resident.releases.length) return '';
  return `<section class="profile-section release-section"><h2>Releases</h2><div class="release-table">${resident.releases.map(renderRelease).join('')}</div></section>`;
}

export function renderResidentHtml(input) {
  const resident = input?.[PUBLIC_RESIDENT] ? input : projectPublicResident(input);
  const canonical = residentPublicUrl(resident.id);
  const pageTitle = `${resident.name} – Distillery Leipzig Resident`;
  const description = residentMetaDescription(resident);
  const image = residentImage(resident);
  const fallbackDimensions = image === RESIDENT_SOCIAL_IMAGE ? '\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : '';
  const facts = [renderFact('City', resident.city), renderFact('Genre', resident.genre), renderFact('Labels', resident.labels), renderFact('Related', resident.relatedProjects)].join('');
  const profileText = resident.pressText || resident.bio;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="../../">
<title>${escapeHtml(pageTitle)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<link rel="icon" href="/assets/distillery-d.svg" type="image/svg+xml">
<link rel="manifest" href="site.webmanifest">
<meta name="theme-color" content="#000000">
<meta property="og:title" content="${escapeHtml(pageTitle)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="Distillery Leipzig">
<meta property="og:image" content="${escapeHtml(image)}">${fallbackDimensions}
<meta property="og:image:alt" content="${escapeHtml(resident.photos.length ? resident.name : 'Distillery Leipzig – Dates, Residents, Club')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(pageTitle)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<style>
:root{--grey:#d9d9d9;--orange:#e49a78}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#000;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.15}a{color:inherit;text-decoration:none}.page{width:800px;min-height:100vh;display:grid;grid-template-columns:606px 194px;background:#fff}.main{padding:18px 58px 14px 30px;background:#fff}.sidebar{background:#000;color:#777;padding:93px 14px 14px 24px;min-height:100vh}.logo{width:280px;height:78px;margin:0 0 8px;overflow:visible}.logo img{display:block;width:280px;height:78px;object-fit:contain}.nav{width:520px;margin-bottom:30px;font-size:13px;font-weight:900;text-transform:uppercase;line-height:1.13}.nav a{display:inline-block;padding:0 2px;margin:0 1px 3px 0;background:var(--grey);color:#000}.nav a:hover,.nav a.active{color:#fff;background:#000}.back-link{display:inline-block;margin-bottom:10px;padding:1px 3px;background:var(--grey);font-weight:900;text-transform:uppercase}.back-link:hover{background:#000;color:#fff}.resident-profile{max-width:520px}.resident-photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 22px}.resident-photos img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}.resident-photos img:first-child{grid-column:1/-1}.hero-placeholder{display:grid;place-items:center;width:100%;aspect-ratio:16/9;background:#eee;color:#777;font-size:24px;margin:0 0 22px;text-transform:uppercase}.resident-title{display:block;width:100%;background:var(--orange);padding:2px 4px;font-size:20px;line-height:1.05;font-weight:900;text-transform:uppercase;margin:0 0 12px}.facts{font-size:12px;margin:0 0 11px}.fact{display:grid;grid-template-columns:74px minmax(0,1fr);gap:0 10px;margin-bottom:3px;align-items:start}.fact b{font-weight:900}.socials,.actions{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 13px}.socials a,.button{display:inline-block;background:var(--grey);padding:5px 8px;font-weight:900}.socials a:hover,.button:hover{background:#000;color:#fff}.actions{margin-bottom:22px}.profile-text{white-space:pre-wrap;line-height:1.24}.profile-section{margin-top:24px}.profile-section h2{display:inline-block;margin:0 0 8px;padding:1px 3px;background:#000;color:#fff;font-size:12px;text-transform:uppercase}.news-list{display:grid;gap:4px}.news-entry{display:grid;grid-template-columns:78px minmax(0,1fr);gap:8px}.news-entry time{color:#555;font-weight:900}.release-table{display:grid;border-top:1px solid #ddd}.release-row{display:grid;grid-template-columns:86px minmax(0,1fr);gap:10px;padding:8px 0;border-bottom:1px solid #ddd}.release-cover{display:block;width:86px;height:86px;object-fit:cover;background:#eee;border:1px solid #ddd}.release-cover-placeholder{display:grid;place-items:center;color:#777;text-transform:uppercase}.release-body h3{margin:0 0 5px;font-size:13px}.release-body .fact{grid-template-columns:62px minmax(0,1fr)}.release-body p{white-space:pre-wrap;line-height:1.24}.release-links{margin-top:6px;color:#04f}.release-links a:hover{text-decoration:underline}.footer{margin-top:92px;font-size:11px;font-weight:900;text-transform:uppercase}.footer small{display:block;margin-top:4px;font-size:10px;font-weight:400;text-transform:none}.footer a:hover{background:#000;color:#fff}@media(max-width:820px){.page{width:100%;grid-template-columns:1fr}.main{padding-right:24px}.sidebar{padding-top:20px;min-height:0}.nav{width:auto}.resident-profile{max-width:100%}.resident-photos{grid-template-columns:1fr}.resident-photos img:first-child{grid-column:auto}.release-row{grid-template-columns:72px minmax(0,1fr)}.release-cover{width:72px;height:72px}}
</style>
<link rel="stylesheet" href="assets/mobile-navigation.css?v=mobile-navigation-7">
<link rel="stylesheet" href="assets/mobile-foundation.css?v=mobile-foundation-4">
</head>
<body data-site-page="residents">
<div class="page">
<main class="main">
<header class="logo" aria-label="Distillery"><img src="assets/distillery-logo.svg" alt="Distillery"></header>
<nav class="nav" aria-label="Hauptnavigation"><a href="index.html">Dates</a><a href="news.html">News</a><a class="active" href="residents.html">Residents</a><a href="about.html">About</a><a href="contact.html">Contact</a><a href="history.html">History</a><a href="feedback.html">Feedback</a><a href="gallery.html">Gallery</a></nav>
<a class="back-link" href="residents.html">back to residents</a>
${renderPhotos(resident)}
<article class="resident-profile">
<h1 class="resident-title">${escapeHtml(resident.name)}</h1>
${facts ? `<div class="facts">${facts}</div>` : ''}
${renderSocials(resident)}
${renderActions(resident)}
${profileText ? `<div class="profile-text">${escapeHtml(profileText)}</div>` : ''}
${renderNews(resident)}
${renderReleases(resident)}
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

function isResidentLocation(location) {
  return /^https:\/\/www\.distillery\.de\/residents\/[A-Za-z0-9._-]+\/$/.test(location);
}

function residentSitemapBlock(location, eol) {
  return `<url>${eol}    <loc>${escapeXml(location)}</loc>${eol}  </url>`;
}

export function updateResidentSitemap(existingXml, residents) {
  const xml = String(existingXml || '');
  const eol = xml.includes('\r\n') ? '\r\n' : '\n';
  const matches = [...xml.matchAll(/<url>[\s\S]*?<\/url>/g)];
  if (!matches.length || !/<urlset\b/.test(xml) || !/<\/urlset>/.test(xml)) throw new Error('sitemap.xml ist ungültig oder enthält keine URL-Einträge.');
  const residentUrls = residents.map(resident => residentPublicUrl(resident.id)).sort();
  if (new Set(residentUrls).size !== residentUrls.length) throw new Error('Kollision der Resident-Sitemap-URLs.');
  const preserved = matches.map(match => match[0]).filter(block => !isResidentLocation(sitemapLocation(block)));
  const generated = residentUrls.map(url => residentSitemapBlock(url, eol));
  const prefix = xml.slice(0, matches[0].index);
  const lastMatch = matches.at(-1);
  const suffix = xml.slice(lastMatch.index + lastMatch[0].length);
  return `${prefix}${[...preserved, ...generated].join(`${eol}  `)}${suffix}`;
}

export function residentSeoArtifacts(document, existingSitemap) {
  if (!document || !Array.isArray(document.residents)) throw new Error('Resident-Dokument residents[] fehlt.');
  const outputKeys = new Map();
  const publicResidents = document.residents.map(projectPublicResident);
  for (const resident of publicResidents) {
    const outputKey = residentOutputPath(resident.id).toLowerCase();
    if (outputKeys.has(outputKey)) throw new Error(`Kollision der Resident-Outputpfade: ${outputKeys.get(outputKey)} / ${resident.id}`);
    outputKeys.set(outputKey, resident.id);
  }
  publicResidents.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const files = new Map();
  for (const resident of publicResidents) files.set(residentOutputPath(resident.id), renderResidentHtml(resident));
  files.set('sitemap.xml', updateResidentSitemap(existingSitemap, publicResidents));
  return { publicResidents, files };
}
