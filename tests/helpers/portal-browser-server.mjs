import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
// Development-only server: inject the mock before the real app module starts.
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
    if (!path.startsWith(root + sep)) throw new Error('Out of scope');
    let body = await readFile(path);
    if (path === resolve(root, 'public/resident-portal/index.html')) {
      body = Buffer.from(body.toString().replace('./js/app-coverfix.js?v=staging-writer-1', '/tests/helpers/portal-browser-mock.mjs'));
    }
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store', 'Content-Security-Policy': "connect-src 'self'; img-src 'self' blob: data:; frame-src 'none'" });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(8769, '127.0.0.1', () => console.log('Portal mock QA: http://127.0.0.1:8769/public/resident-portal/?environment=staging&resident=fixture-resident&invite=fixture-invite'));
