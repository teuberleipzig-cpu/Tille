import { readFile, mkdir, rm, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeWordPressPosts } from './news-model.mjs';
import { renderArticle, renderOverview } from './news-render.mjs';
import { fetchWordPressPosts } from './wordpress-client.mjs';

async function exists(target) {
  try { await readFile(target); return true; } catch (error) { if (error.code === 'EISDIR') return true; if (error.code === 'ENOENT') return false; throw error; }
}

async function moveIfPresent(from, to) {
  if (!await exists(from)) return false;
  await rename(from, to);
  return true;
}

function validateRendered(files) {
  for (const [name, html] of files) {
    if (!html.startsWith('<!doctype html>') || !html.includes('</html>')) throw new Error(`Rendering unvollständig: ${name}`);
    if (/\b(?:wp-admin\/|wp-login\.php|\/wp-json\/)/i.test(html)) throw new Error(`WordPress-System-URL im Output: ${name}`);
  }
}

export async function generateNewsSite({ rawPosts = [], outputRoot, renderArticleImpl = renderArticle, failBeforePublish = false, failAfterNewsPublish = false }) {
  const root = path.resolve(outputRoot);
  const posts = normalizeWordPressPosts(rawPosts);
  const files = new Map([
    ['news/index.html', renderOverview(posts, { depth: 1, articlePrefix: '' })],
    ['news.html', renderOverview(posts, { depth: 0, articlePrefix: 'news/' })],
    ...posts.map(post => [`news/${post.slug}/index.html`, renderArticleImpl(post)])
  ]);
  validateRendered(files);

  const nonce = `${process.pid}-${Math.random().toString(16).slice(2)}`;
  const stageRoot = path.join(root, `.news-stage-${nonce}`);
  const stageNews = path.join(stageRoot, 'news');
  const stageLegacy = path.join(stageRoot, 'news.html');
  const newsPath = path.join(root, 'news');
  const legacyPath = path.join(root, 'news.html');
  const backupNews = path.join(root, `.news-backup-${nonce}`);
  const backupLegacy = path.join(root, `.news-html-backup-${nonce}`);
  let newsBackedUp = false, legacyBackedUp = false, newsPublished = false;
  try {
    for (const [relative, html] of files) {
      const destination = relative === 'news.html' ? stageLegacy : path.join(stageRoot, relative);
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, html, 'utf8');
    }
    if (failBeforePublish) throw new Error('Injected generation failure.');
    newsBackedUp = await moveIfPresent(newsPath, backupNews);
    await rename(stageNews, newsPath); newsPublished = true;
    if (failAfterNewsPublish) throw new Error('Injected publish failure.');
    legacyBackedUp = await moveIfPresent(legacyPath, backupLegacy);
    await rename(stageLegacy, legacyPath);
    await Promise.allSettled([
      rm(backupNews, { recursive: true, force: true }),
      rm(backupLegacy, { force: true }),
      rm(stageRoot, { recursive: true, force: true })
    ]);
    return { posts, files: [...files.keys()] };
  } catch (error) {
    if (newsPublished) await rm(newsPath, { recursive: true, force: true });
    if (newsBackedUp && await exists(backupNews)) await rename(backupNews, newsPath);
    if (legacyBackedUp && await exists(backupLegacy)) { await rm(legacyPath, { force: true }); await rename(backupLegacy, legacyPath); }
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  }
}

function parseArguments(argv) {
  const result = { outputRoot: process.cwd(), mode: '' };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--input') { result.input = argv[++index]; result.mode = 'input'; }
    else if (arg === '--wordpress') result.mode = 'wordpress';
    else if (arg === '--empty') result.mode = 'empty';
    else if (arg === '--out') result.outputRoot = argv[++index];
    else throw new Error(`Unbekanntes Argument: ${arg}`);
  }
  if (!result.mode) throw new Error('Bitte --input, --wordpress oder --empty angeben.');
  return result;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  let rawPosts = [];
  if (options.mode === 'input') rawPosts = JSON.parse(await readFile(path.resolve(options.input), 'utf8'));
  if (options.mode === 'wordpress') rawPosts = await fetchWordPressPosts({ wordpressBaseUrl: process.env.WORDPRESS_BASE_URL });
  const result = await generateNewsSite({ rawPosts, outputRoot: options.outputRoot });
  process.stdout.write(`News generiert: ${result.posts.length} Beiträge, ${result.files.length} Dateien.\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
