const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_MAX_PAGES = 20;
const DEFAULT_TIMEOUT_MS = 10000;

function baseUrl(value) {
  const raw = String(value || '').trim().replace(/\/+$/, '');
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error('WORDPRESS_BASE_URL ist ungültig.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('WORDPRESS_BASE_URL muss HTTP oder HTTPS verwenden.');
  return url.href.replace(/\/$/, '');
}

async function fetchPage(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try { response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } }); }
  catch (error) { throw new Error(`WordPress REST nicht erreichbar: ${error.message}`); }
  finally { clearTimeout(timer); }
  if (!response?.ok) throw new Error(`WordPress REST HTTP ${response?.status || 'unbekannt'}.`);
  let data;
  try { data = await response.json(); } catch (error) { throw new Error(`WordPress REST liefert ungültiges JSON: ${error.message}`); }
  if (!Array.isArray(data)) throw new Error('WordPress REST Posts-Response ist kein Array.');
  return { data, totalPages: Number(response.headers?.get?.('x-wp-totalpages') || 0) };
}

export async function fetchWordPressPosts({ wordpressBaseUrl, fetchImpl = globalThis.fetch, pageSize = DEFAULT_PAGE_SIZE, maxPages = DEFAULT_MAX_PAGES, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Fetch-Implementierung fehlt.');
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('Pagination-Limit ist ungültig.');
  const root = baseUrl(wordpressBaseUrl);
  const posts = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${root}/wp-json/wp/v2/posts?status=publish&_embed=1&per_page=${pageSize}&page=${page}`;
    const result = await fetchPage(fetchImpl, url, timeoutMs);
    posts.push(...result.data);
    if (!result.data.length || (result.totalPages && page >= result.totalPages) || (!result.totalPages && result.data.length < pageSize)) return posts;
  }
  throw new Error(`WordPress-Pagination überschreitet das Limit von ${maxPages} Seiten.`);
}
