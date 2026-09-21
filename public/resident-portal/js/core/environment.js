export const LIVE_BLOCK = 'Live Resident Portal publishing is not activated yet.';
export function resolveEnvironment(hostname, search = '') {
  const params = new URLSearchParams(search);
  if (params.has('branch')) throw new Error('Legacy branch-Parameter ist nicht erlaubt. Bitte Portal-Link ohne branch verwenden.');
  const local = ['localhost', '127.0.0.1'].includes(hostname);
  if (!local && params.has('environment')) throw new Error('Environment-Override ist nur lokal erlaubt.');
  let environment;
  if (hostname === 'www-test.distillery.de') environment = 'staging';
  else if (hostname === 'www.distillery.de') environment = 'live';
  else if (local && params.get('environment') === 'staging') environment = 'staging';
  else throw new Error('Unbekannte Portalumgebung. Lokal ist ?environment=staging erforderlich.');
  return Object.freeze({ environment, contentRef: `content/${environment}` });
}
export function assertWritable(context) {
  if (context?.environment === 'live') throw new Error(LIVE_BLOCK);
  if (context?.environment !== 'staging' || context.contentRef !== 'content/staging') {
    throw new Error('Portal-Schreiben ohne gebundene Stagingumgebung gesperrt.');
  }
}
