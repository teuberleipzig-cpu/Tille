import { pagesConfig } from './contract.mjs';
import { normalizePage } from './page-model.mjs';

async function fetchPage(config, id, fetchImpl, timeoutMs) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('WordPress Pages request timed out.')); }, timeoutMs);
  });
  try {
    return await Promise.race([timeout, (async () => {
      const response = await fetchImpl(`${config.baseUrl}/wp-json/wp/v2/pages/${id}?context=view`, {
        signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' }
      });
      if (!response?.ok) throw new Error(`WordPress Pages HTTP ${response?.status || 'unknown'}.`);
      let page;
      try { page = await response.json(); } catch { throw new Error('WordPress Pages returned invalid JSON.'); }
      return normalizePage(page, id, config.baseUrl);
    })()]);
  } finally { clearTimeout(timer); }
}
export async function fetchPages(options) {
  const config = pagesConfig(options); // Validate BOTH IDs and live gate before any fetch.
  const { fetchImpl = globalThis.fetch, timeoutMs = 10000 } = options;
  if (typeof fetchImpl !== 'function' || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    throw new Error('Invalid Pages fetch/timeout configuration.');
  }
  const pages = new Map();
  for (const name of ['about', 'history']) pages.set(`${name}.html`, await fetchPage(config, config[name], fetchImpl, timeoutMs));
  return pages;
}
