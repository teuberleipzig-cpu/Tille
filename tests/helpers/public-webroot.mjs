import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import path from 'node:path';

// Positive path ownership; mirrors explicit Docker COPY sources, not a blacklist.
export const directories = ['assets', 'events', 'news', 'residents',
  'public/admin/css', 'public/admin/js', 'public/admin/extensions', 'public/admin/public',
  'public/resident-portal', 'public/events', 'public/residents', 'public/gallery', 'public/site'];
export const rootFiles = ['robots.txt', 'sitemap.xml', 'site.webmanifest', 'favicon.svg'];
export const negativePaths = ['scripts/content/compose-site.mjs', 'tests/staging-acceptance.test.mjs',
  'docs/CONTENT_COMPOSITION.md', '.github/workflows/docker-publish.yml', 'docker/Dockerfile',
  'docker/nginx.conf', 'docker/nginx.staging.conf', 'LEGAL_PRIVACY_REVIEW_INFO_NEEDED.md',
  'PUBLIC_INTERNAL_LINK_AUDIT_2026-06-29.md', 'events.json', 'reports/', '.git/config',
  'robots.staging.txt', 'robots.live.txt', 'sitemap.live.xml',
  'public/admin/WRITE_TEST_RUNBOOK.md', 'public/admin/structure-18-checkpoint.txt'];

export function isPublic(file) {
  return /^[^/]+\.html$/.test(file) || rootFiles.includes(file)
    || file === '.well-known/security.txt' || /^public\/admin\/[^/]+\.(?:html|js)$/.test(file)
    || directories.some(dir => file.startsWith(dir + '/'));
}

export function inventory(root, prefix = '') {
  const result = [];
  for (const name of readdirSync(path.join(root, prefix)).sort()) {
    if (name === '.git') continue;
    const file = prefix + name;
    const stat = lstatSync(path.join(root, file));
    if (stat.isSymbolicLink()) throw new Error(`Symlink not allowed: ${file}`);
    if (stat.isDirectory()) result.push(...inventory(root, file + '/'));
    else result.push(file);
  }
  return result.sort();
}

// Reproducible literal reference audit, supplemented by full content namespace
// preservation and real HTTP checks (not a claim to interpret arbitrary JS).
export function referenceInventory(root, files) {
  const known = new Set(files);
  const references = new Set();
  for (const file of files.filter(f => isPublic(f) && /\.(?:html|css|js|webmanifest|xml)$/.test(f))) {
    const text = readFileSync(path.join(root, file), 'utf8');
    const values = [...text.matchAll(/(?:src|href|action)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s"')]+)|["']((?:\.{0,2}\/)?[\w./-]+\.(?:m?js|css|json|html|svg|png|jpg|webp|woff2?)(?:\?[^"']*)?)["']|<loc>([^<]+)<\/loc>/g)];
    for (const match of values) {
      // A Blob download filename is not a URL loaded from the webroot.
      if (match[3] && /\.download\s*=\s*$/.test(text.slice(Math.max(0, match.index - 40), match.index))) continue;
      const value = match.slice(1).find(Boolean);
      let url;
      try { url = new URL(value, 'https://www.distillery.de/' + file); } catch { continue; }
      if (url.origin !== 'https://www.distillery.de') continue;
      let target = decodeURIComponent(url.pathname).slice(1);
      if (!target || target.endsWith('/')) target += 'index.html';
      if (known.has(target)) references.add(target);
      // Browser fetch literals may be relative to the document rather than module.
      const documentRelative = value.replace(/^\.\//, '').split(/[?#]/)[0];
      if (known.has(documentRelative)) references.add(documentRelative);
    }
  }
  return [...references].sort();
}
