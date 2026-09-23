const ORIGIN = 'https://www-test.distillery.de';
const failures = new WeakSet();

export function acceptanceFailure(endpoint, reason) {
  const error = new Error(`Staging acceptance ${endpoint}: ${reason}.`);
  failures.add(error);
  return error;
}

export function acceptanceFailureMessage(error) {
  return failures.has(error) ? error.message : null;
}

export function parseAcceptanceJson(text, endpoint) {
  try { return JSON.parse(text); }
  catch { throw acceptanceFailure(endpoint, 'invalid JSON'); }
}

// Reject ambiguous paths before URL normalization. Never follow content to another host.
export function internalAcceptancePath(value, endpoint) {
  if (typeof value !== 'string' || !/^\/?[a-zA-Z0-9_./-]*(?:\?[^#\s\\]*)?(?:#[^\s\\]*)?$/.test(value)
    || value.startsWith('//') || value.split(/[?#]/)[0].split('/').some(s => s === '.' || s === '..')) {
    throw acceptanceFailure(endpoint, 'unsafe internal path');
  }
  const url = new URL(value || '/', ORIGIN);
  if (url.origin !== ORIGIN) throw acceptanceFailure(endpoint, 'foreign origin');
  url.hash = '';
  return url.pathname + url.search;
}

export function acceptanceClient(fetchImpl, query) {
  if (!/^[0-9]+-[0-9]+-[0-9]+$/.test(query || '')) throw acceptanceFailure('/', 'invalid probe identity');
  const budget = AbortSignal.timeout(60000);
  return async function read(path, { json = false, label = path } = {}) {
    const url = new URL(internalAcceptancePath(path, label), ORIGIN);
    url.searchParams.set('deploy_verify', query);
    let response, text;
    try {
      response = await fetchImpl(url.href, { method: 'GET', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.any([budget, AbortSignal.timeout(10000)]) });
    } catch { throw acceptanceFailure(label, 'request failed or timed out'); }
    try {
      if (response.status !== 200 || response.redirected) throw acceptanceFailure(label, 'expected HTTP 200 without redirect');
      const robots = (response.headers.get('x-robots-tag') || '').toLowerCase().split(/[,\s]+/);
      if (!['noindex', 'nofollow', 'noarchive'].every(t => robots.includes(t))) {
        throw acceptanceFailure(label, 'missing noindex/nofollow/noarchive');
      }
      const cache = (response.headers.get('cache-control') || '').toLowerCase().split(',').map(s => s.trim());
      // nginx internally serves directory indexes as HTML; HTML/JS/CSS revalidate.
      const directive = json ? 'no-store' : /\.(?:html|js|css)$|\/$/i.test(url.pathname) ? 'no-cache' : null;
      if (directive && !cache.includes(directive)) throw acceptanceFailure(label, `missing ${directive}`);
      text = await response.text();
    } catch (error) {
      try { await response.body?.cancel(); } catch { /* Discard only; never log transport details. */ }
      throw failures.has(error) ? error : acceptanceFailure(label, 'response could not be read');
    }
    return json ? parseAcceptanceJson(text, label) : text;
  };
}
