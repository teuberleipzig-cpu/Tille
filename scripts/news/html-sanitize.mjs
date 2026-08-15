const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'h4', 'figure', 'figcaption', 'img']);
const VOID_TAGS = new Set(['br', 'img']);
const DROP_CONTENT_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form']);
const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function decodeHtmlEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const point = Number.parseInt(entity[1].toLowerCase() === 'x' ? entity.slice(2) : entity.slice(1), entity[1].toLowerCase() === 'x' ? 16 : 10);
      return Number.isSafeInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

export function plainTextFromHtml(value) {
  return decodeHtmlEntities(sanitizeHtml(value).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

export function safeHttpUrl(value, { allowRelative = false } = {}) {
  const raw = decodeHtmlEntities(value).trim();
  if (!raw || /(?:^|\/)wp-admin(?:\/|$)|wp-login\.php|\/wp-json(?:\/|$)/i.test(raw)) return '';
  if (allowRelative && /^(?:\.{0,2}\/|\/)[^\\?#]*$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch (_) { return ''; }
}

function findTagEnd(html, start) {
  let quote = '';
  for (let index = start; index < html.length; index++) {
    const char = html[index];
    if (quote) { if (char === quote) quote = ''; }
    else if (char === '"' || char === "'") quote = char;
    else if (char === '>') return index;
  }
  return -1;
}

function parseAttributes(source) {
  const attributes = [];
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) attributes.push([match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '']);
  return attributes;
}

function sanitizeAttributes(tag, source, blockedAnchorOrigins) {
  const allowed = tag === 'a' ? new Set(['href', 'title', 'target']) : tag === 'img' ? new Set(['src', 'alt', 'title', 'width', 'height']) : new Set([]);
  const clean = new Map();
  for (const [name, value] of parseAttributes(source)) {
    if (!allowed.has(name) || name.startsWith('on')) continue;
    if (name === 'href') {
      const safe = safeHttpUrl(value, { allowRelative: true });
      const blocked = safe && blockedAnchorOrigins.size > 0 && (safe.startsWith('/') || safe.startsWith('./') || safe.startsWith('../') || blockedAnchorOrigins.has(new URL(safe).origin));
      if (safe && !blocked) clean.set(name, safe);
    }
    else if (name === 'src') { const safe = safeHttpUrl(value); if (safe) clean.set(name, safe); }
    else if ((name === 'width' || name === 'height') && /^\d{1,4}$/.test(value)) clean.set(name, value);
    else if (name === 'target' && value === '_blank') clean.set(name, value);
    else if (name !== 'target') clean.set(name, decodeHtmlEntities(value));
  }
  if (tag === 'a' && clean.get('target') === '_blank') clean.set('rel', 'noopener noreferrer');
  return [...clean].map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join('');
}

export function sanitizeHtml(value, { blockedAnchorOrigins = [] } = {}) {
  const html = String(value ?? '');
  const blocked = new Set(blockedAnchorOrigins.map(value => { try { return new URL(value).origin; } catch (_) { return ''; } }).filter(Boolean));
  let output = '', index = 0, dropping = '';
  while (index < html.length) {
    const open = html.indexOf('<', index);
    if (open < 0) { if (!dropping) output += html.slice(index); break; }
    if (!dropping) output += html.slice(index, open);
    if (html.startsWith('<!--', open)) { const end = html.indexOf('-->', open + 4); index = end < 0 ? html.length : end + 3; continue; }
    const end = findTagEnd(html, open + 1);
    if (end < 0) { if (!dropping) output += '&lt;'; index = open + 1; continue; }
    const raw = html.slice(open + 1, end).trim();
    const closing = raw.startsWith('/');
    const name = (closing ? raw.slice(1) : raw).match(/^([a-z0-9]+)/i)?.[1]?.toLowerCase() || '';
    if (dropping) { if (closing && name === dropping) dropping = ''; index = end + 1; continue; }
    if (!closing && DROP_CONTENT_TAGS.has(name)) { dropping = name; index = end + 1; continue; }
    if (ALLOWED_TAGS.has(name)) {
      if (closing) { if (!VOID_TAGS.has(name)) output += `</${name}>`; }
      else output += `<${name}${sanitizeAttributes(name, raw.slice(name.length), blocked)}>`;
    }
    index = end + 1;
  }
  return output;
}
