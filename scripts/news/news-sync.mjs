import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const AUTOMATION_BRANCH = 'automation/wordpress-news-sync';
export const SYNC_PR_BASE = 'main';

export function validateWordPressBaseUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('WORDPRESS_BASE_URL is not configured.');
  let url;
  try { url = new URL(raw); } catch (_) { throw new Error('WORDPRESS_BASE_URL is malformed.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('WORDPRESS_BASE_URL must use HTTP or HTTPS.');
  if (url.username || url.password) throw new Error('WORDPRESS_BASE_URL must not contain credentials.');
  if (url.search || url.hash) throw new Error('WORDPRESS_BASE_URL must not contain a query or fragment.');
  return url.href.replace(/\/$/, '');
}

export function isAllowedNewsOutputPath(file) {
  const normalized = String(file || '').replaceAll('\\', '/');
  return normalized === 'news.html'
    || normalized === 'news/index.html'
    || /^news\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.html$/.test(normalized);
}

export function assertAllowedNewsOutputPaths(files) {
  for (const file of files) {
    if (!isAllowedNewsOutputPath(file)) throw new Error(`News sync output path is not allowed: ${file}`);
  }
}

export function assertNewsOutputContentSafe(files) {
  const values = entries(files);
  for (const [file, content] of values) {
    if (/\b(?:href|src)\s*=\s*["']\s*(?:javascript|data|blob):/i.test(content) || /;base64,/i.test(content)) {
      throw new Error(`Unsafe URL or Base64 content in generated news output: ${file}`);
    }
    if (/\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/.test(content)) {
      throw new Error(`Possible secret in generated news output: ${file}`);
    }
  }
}

function entries(files) {
  return files instanceof Map ? files : new Map(Object.entries(files || {}));
}

function articleSlug(file) {
  const match = /^news\/([^/]+)\/index\.html$/.exec(file);
  return match?.[1] || '';
}

export function diffNewsOutput(currentFiles, generatedFiles) {
  const current = entries(currentFiles);
  const generated = entries(generatedFiles);
  assertAllowedNewsOutputPaths([...current.keys(), ...generated.keys()]);
  const changedFiles = [...new Set([...current.keys(), ...generated.keys()])]
    .filter(file => current.get(file) !== generated.get(file))
    .sort();
  const added = [], updated = [], removed = [];
  for (const file of changedFiles) {
    const slug = articleSlug(file);
    if (!slug) continue;
    if (!current.has(file)) added.push(slug);
    else if (!generated.has(file)) removed.push(slug);
    else updated.push(slug);
  }
  return {
    hasChanges: changedFiles.length > 0,
    changedFiles,
    added,
    updated,
    removed,
    overviewChanged: changedFiles.includes('news/index.html'),
    legacyChanged: changedFiles.includes('news.html')
  };
}

export function planNewsSync({ mode, diff, existingPrNumber = null }) {
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error(`Unsupported sync mode: ${mode}`);
  if (mode === 'validate-only' || !diff.hasChanges) return { action: 'none', write: false };
  return {
    action: existingPrNumber ? 'update-pr' : 'create-pr',
    write: true,
    branch: AUTOMATION_BRANCH,
    base: SYNC_PR_BASE,
    draft: true,
    prNumber: existingPrNumber
  };
}

async function collect(root, relative, output) {
  const directory = path.join(root, relative);
  let items;
  try { items = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const item of items) {
    const child = path.posix.join(relative.replaceAll('\\', '/'), item.name);
    if (item.isDirectory()) await collect(root, child, output);
    else if (item.isFile()) output.set(child, await readFile(path.join(root, child), 'utf8'));
    else throw new Error(`Unsupported news output entry: ${child}`);
  }
}

export async function readNewsOutput(root) {
  const output = new Map();
  try { output.set('news.html', await readFile(path.join(root, 'news.html'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await collect(root, 'news', output);
  assertAllowedNewsOutputPaths(output.keys());
  return output;
}

export async function applyNewsOutput(workspaceRoot, generatedFiles) {
  const files = entries(generatedFiles);
  assertAllowedNewsOutputPaths(files.keys());
  assertNewsOutputContentSafe(files);
  if (!files.has('news.html') || !files.has('news/index.html')) throw new Error('Generated news output is incomplete.');
  await rm(path.join(workspaceRoot, 'news'), { recursive: true, force: true });
  await rm(path.join(workspaceRoot, 'news.html'), { force: true });
  for (const [file, content] of files) {
    const destination = path.join(workspaceRoot, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, 'utf8');
  }
}
