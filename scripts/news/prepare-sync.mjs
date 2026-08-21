import { appendFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateNewsSite, loadNewsSource } from './generate-news.mjs';
import { applyNewsOutput, assertNewsOutputContentSafe, diffNewsOutput, readNewsOutput, validateWordPressBaseUrl } from './news-sync.mjs';
import { updateNewsSitemap } from './news-seo.mjs';

export async function prepareNewsSync({ mode, workspaceRoot, wordpressBaseUrl, fetchImpl = globalThis.fetch }) {
  if (!['validate-only', 'sync-pr'].includes(mode)) throw new Error(`Unsupported sync mode: ${mode}`);
  const sourceOrigin = validateWordPressBaseUrl(wordpressBaseUrl);
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'tille-news-sync-'));
  try {
    const currentFiles = await readNewsOutput(workspaceRoot);
    const source = await loadNewsSource({ mode: 'wordpress', wordpressBaseUrl: sourceOrigin, fetchImpl });
    const result = await generateNewsSite({ rawPosts: source.rawPosts, outputRoot: temporaryRoot, sourceOrigin: source.sourceOrigin });
    await writeFile(path.join(temporaryRoot, 'sitemap.xml'), updateNewsSitemap(currentFiles.get('sitemap.xml'), result.posts), 'utf8');
    const generatedFiles = await readNewsOutput(temporaryRoot);
    assertNewsOutputContentSafe(generatedFiles);
    const diff = diffNewsOutput(currentFiles, generatedFiles);
    if (mode === 'sync-pr' && diff.hasChanges) await applyNewsOutput(workspaceRoot, generatedFiles);
    return {
      ...diff,
      receivedPosts: source.rawPosts.length,
      normalizedPosts: result.posts.length,
      articleCount: result.posts.length,
      slugs: result.posts.map(post => post.slug),
      sourceOrigin
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const result = { workspaceRoot: process.cwd() };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--mode') result.mode = argv[++index];
    else if (argv[index] === '--workspace') result.workspaceRoot = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return result;
}

async function writeActionsOutput(summary) {
  if (!process.env.GITHUB_OUTPUT) return;
  const lines = [
    `has_changes=${summary.hasChanges}`,
    `received_posts=${summary.receivedPosts}`,
    `normalized_posts=${summary.normalizedPosts}`,
    `article_count=${summary.articleCount}`,
    `slugs=${summary.slugs.join(',')}`,
    `added=${summary.added.join(',')}`,
    `updated=${summary.updated.join(',')}`,
    `removed=${summary.removed.join(',')}`,
    `sitemap_changed=${summary.sitemapChanged}`,
    `source_origin=${summary.sourceOrigin}`
  ];
  await appendFile(process.env.GITHUB_OUTPUT, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const summary = await prepareNewsSync({ ...options, wordpressBaseUrl: process.env.WORDPRESS_BASE_URL });
  await writeActionsOutput(summary);
  console.log(`WordPress news validation PASS: received=${summary.receivedPosts}, normalized=${summary.normalizedPosts}, articles=${summary.articleCount}.`);
  console.log(summary.hasChanges ? `News changes: added=${summary.added.length}, updated=${summary.updated.length}, removed=${summary.removed.length}.` : 'No WordPress news changes detected.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
