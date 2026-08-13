export const SITE_PAGE_IDS = ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback', 'gallery', 'team', 'podcast', 'merch'];
const AVAILABLE_BY_DEFAULT = new Set(['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback']);

export function normalizeSiteNavigation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Navigation muss ein JSON-Objekt sein.');
  if (!Array.isArray(value.pages)) throw new Error('Navigation pages[] fehlt.');
  const ids = value.pages.map(page => String(page?.id || '').trim());
  if (new Set(ids).size !== ids.length) throw new Error('Navigations-IDs müssen eindeutig sein.');
  const seen = new Set();
  const byId = new Map(value.pages.map(page => [String(page?.id || '').trim(), page]));
  const pages = SITE_PAGE_IDS.map((id, index) => {
    const source = byId.get(id);
    if (!source) throw new Error('Navigationsseite fehlt: ' + id);
    if (seen.has(id)) throw new Error('Doppelte Navigations-ID: ' + id);
    seen.add(id);
    const label = String(source.label || '').trim();
    const href = String(source.href || '').trim();
    if (!label || !href) throw new Error('Label oder Link fehlt: ' + id);
    const available = source.available == null ? AVAILABLE_BY_DEFAULT.has(id) : source.available === true;
    const enabled = source.enabled === true;
    if (!available && enabled) throw new Error('Nicht verfügbare Navigationsseite darf nicht aktiviert sein: ' + id);
    return { ...source, id, label, href, available, enabled, order: Number.isFinite(Number(source.order)) ? Number(source.order) : index + 1 };
  }).sort((a, b) => a.order - b.order || SITE_PAGE_IDS.indexOf(a.id) - SITE_PAGE_IDS.indexOf(b.id)).map((page, index) => ({ ...page, order: index + 1 }));
  if (!pages.some(page => page.available && page.enabled)) throw new Error('Mindestens eine verfügbare Navigationsseite muss aktiv sein.');
  const homePage = String(value.homePage || '').trim();
  if (!pages.some(page => page.id === homePage && page.available && page.enabled)) throw new Error('Startseite muss eine verfügbare und aktive Seite sein.');
  return { ...value, schemaVersion: Number(value.schemaVersion) || 1, homePage, pages };
}

export function moveSitePage(config, id, offset) {
  const next = normalizeSiteNavigation(config);
  const index = next.pages.findIndex(page => page.id === id);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= next.pages.length) return next;
  const pages = [...next.pages];
  [pages[index], pages[target]] = [pages[target], pages[index]];
  return { ...next, pages: pages.map((page, order) => ({ ...page, order: order + 1 })) };
}
