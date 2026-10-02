// GET-only localhost harness. All content/SEO fixtures stay in memory.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { storageArtifacts } from '../../public/site/js/event-storage-model.js';
import { eventSeoArtifacts } from '../../scripts/events/event-seo.mjs';
import { categoryFixture } from './event-categories-fixture.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = process.argv.includes('--baseline') ? 'c58ad4c60a55b132d10296390c6ab8cdd84b470e' : null;
const sitemap = '<urlset><url><loc>https://www.distillery.de/</loc></url></urlset>';
const files = new Map([...storageArtifacts(categoryFixture).files, ...eventSeoArtifacts(categoryFixture, sitemap).files]);
files.set('public/residents/data/residents.json', JSON.stringify({ residents: [] }));
const ids = ['dates', 'news', 'residents', 'about', 'contact', 'history', 'feedback', 'gallery', 'team', 'podcast', 'merch'];
files.set('public/site/data/site-navigation.json', JSON.stringify({ schemaVersion: 1, homePage: 'dates',
  pages: ids.map((id, i) => ({ id, label: id.toUpperCase(), href: id === 'dates' ? 'index.html' : `${id}.html`,
    order: i + 1, enabled: i < 8, available: true })) }));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let failed = 0, mutations = 0;

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET') { mutations++; res.writeHead(405).end(); return; }
  try {
    let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1);
    if (!file || file.endsWith('/')) file += 'index.html';
    if (file.includes('\\') || file.split('/').some(part => part === '..' || part === '.')) throw new Error('unsafe path');
    let body = files.get(file);
    if (body === undefined) {
      if (!['index.html', 'event.html', 'site.webmanifest'].includes(file) && !/^(assets|public\/site\/js)\//.test(file)) throw new Error('not in fixture');
      body = baseline ? execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root }) : await readFile(path.join(root, file));
    }
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'" });
    res.end(body);
  } catch {
    failed++; console.error(`Fixture request failed: ${req.url}`);
    res.writeHead(404).end('Not part of the synthetic fixture');
  }
});
server.listen(0, '127.0.0.1', () => console.log(`C2 fixture: http://127.0.0.1:${server.address().port}/index.html?month=2026-10 (PID ${process.pid})`));
process.on('SIGINT', () => server.close(() => { console.log(JSON.stringify({ failed, mutations })); process.exit(0); }));
