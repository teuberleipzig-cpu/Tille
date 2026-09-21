// Local integration QA only. All GitHub traffic is simulated; no credentials leave the browser.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { githubMock } from './admin-staging-github.mjs';
import { fixtureData } from './portal-github-fixture.mjs';
import { storageArtifacts } from '../../public/site/js/event-storage-model.js';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const event = { id: 'fm-11111111-2222-3333-4444-555555555555', date: '2026-10-16', title: 'Integration Fixture Event', color: 'orange', imageUrl: '', sections: [] };
const files = Object.fromEntries(storageArtifacts({ events: [event] }).files);
files['public/residents/data/residents.json'] = JSON.stringify(fixtureData());
files['public/gallery/data/gallery.json'] = '{"schemaVersion":1,"playlists":[]}';
files['public/site/data/site-navigation.json'] = await readFile(resolve(root, 'public/site/data/site-navigation.json'), 'utf8');
files['sitemap.xml'] = '<?xml version="1.0"?><urlset><url><loc>https://www.distillery.de/</loc></url></urlset>';
const mock = githubMock(files);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/__mock') {
      let input = ''; for await (const chunk of req) input += chunk;
      const { path, method, body, control } = JSON.parse(input);
      if (control === '403') mock.dispatchFailure = true;
      else if (control === 'conflict') {
        const old = mock.content; mock.content = 'e'.repeat(40); mock.commits.set(mock.content, mock.commits.get(old));
        const document = JSON.parse(mock.text('public/residents/data/residents.json'));
        document.residents[0].city = 'Concurrent mock city';
        // Simulate a concurrent field change while preserving a valid immutable snapshot.
        const previous = mock.before;
        mock.before = call => call.path.startsWith('/contents/public/residents/data/residents.json')
          ? { ok: true, status: 200, json: async () => ({ sha: 'f'.repeat(40), encoding: 'base64', content: Buffer.from(JSON.stringify(document)).toString('base64') }) }
          : previous?.(call, mock);
      } else {
        if (!path?.startsWith('/')) throw new Error('Invalid mock path');
        const reply = await mock.fetch('https://api.github.com/repos/teuberleipzig-cpu/Tille' + path, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
        res.writeHead(reply.status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(await reply.json())); return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); return;
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
    if (!file.startsWith(root + sep)) throw new Error('Out of scope');
    let body = files[url.pathname.slice(1)] ?? await readFile(file);
    if (file === resolve(root, 'public/admin/index.html')) body = body.toString().replace('<head>', '<head><script src="/tests/helpers/admin-browser-mock.js"></script>');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "connect-src 'self'; img-src 'self' blob: data:; frame-src 'none'" });
    res.end(body);
  } catch { res.writeHead(404); res.end('Mock resource not found'); }
});
server.listen(8770, '127.0.0.1', () => console.log('Admin mock QA: http://127.0.0.1:8770/public/admin/'));
