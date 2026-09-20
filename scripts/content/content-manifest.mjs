// Single serializable B1a classification. Tree patterns match the WHOLE relative path.
// Existing operation-specific production gates are intentionally not replaced.
const rules = [
  { id: 'event-months', classification: 'MUTABLE', tree: 'public/events/data/months/', pattern: '[0-9]{4}-(0[1-9]|1[0-2])\\.json', owners: ['public/site/js/event-storage-model.js', 'scripts/filemaker/filemaker-event-intake.mjs', 'public/admin/js/core/event-image-only-save.js'] },
  { id: 'event-meta', classification: 'MUTABLE', exact: 'public/events/data/meta.json', replacementTree: 'public/events/data/', owners: ['public/site/js/event-storage-model.js'] },
  { id: 'event-manifest', classification: 'GENERATED', exact: 'public/events/data/manifest.json', owners: ['public/site/js/event-storage-model.js'] },
  { id: 'event-index', classification: 'GENERATED', exact: 'public/events/data/event-index.json', owners: ['public/site/js/event-storage-model.js'] },
  { id: 'event-search', classification: 'GENERATED', exact: 'public/events/data/search-index.json', owners: ['public/site/js/event-storage-model.js'] },
  { id: 'event-pages', classification: 'GENERATED', tree: 'events/', pattern: '[A-Za-z0-9._-]+/index\\.html', owners: ['scripts/events/event-seo.mjs', 'scripts/filemaker/filemaker-event-intake.mjs', 'public/admin/js/core/event-image-only-save.js'] },
  { id: 'event-media', classification: 'MUTABLE', tree: 'public/events/media/', pattern: '[a-z0-9-]+/[A-Za-z0-9_-]+\\.jpg', owners: ['public/admin/js/event-assets.js', 'public/admin/js/github-media.js'] },
  { id: 'residents', classification: 'MUTABLE', exact: 'public/residents/data/residents.json', replacementTree: 'public/residents/data/', owners: ['public/admin/js/auto-github-load.js', 'public/admin/js/features/residents/residents-news-csv-save.js', 'public/resident-portal/js/core/github.js'] },
  { id: 'resident-images', classification: 'MUTABLE', tree: 'public/residents/media/', pattern: '[a-z0-9-]+/(photos|releases)/[A-Za-z0-9_-]+\\.jpg', owners: ['public/admin/js/residents-media.js', 'public/admin/js/releases-workflow.js', 'public/resident-portal/js/modules/media.js', 'public/resident-portal/js/modules/releases.js'] },
  { id: 'resident-presskits', classification: 'MUTABLE', tree: 'public/residents/media/', pattern: '[a-z0-9-]+/presskit/[A-Za-z0-9_-]+\\.(pdf|zip)', owners: ['public/admin/js/residents-media.js', 'public/resident-portal/js/modules/media.js'] },
  { id: 'resident-pages', classification: 'GENERATED', tree: 'residents/', pattern: '[A-Za-z0-9._-]+/index\\.html', owners: ['scripts/residents/resident-seo.mjs'] },
  { id: 'news-legacy', classification: 'GENERATED', exact: 'news.html', owners: ['scripts/news/generate-news.mjs'] },
  { id: 'news-overview', classification: 'GENERATED', exact: 'news/index.html', owners: ['scripts/news/generate-news.mjs'] },
  { id: 'news-articles', classification: 'GENERATED', tree: 'news/', pattern: '[a-z0-9]+(?:-[a-z0-9]+)*/index\\.html', owners: ['scripts/news/generate-news.mjs'] },
  { id: 'gallery', classification: 'MUTABLE', exact: 'public/gallery/data/gallery.json', replacementTree: 'public/gallery/data/', owners: ['public/admin/js/features/gallery/gallery.js', 'public/admin/js/features/gallery/gallery-save.js'] },
  { id: 'gallery-media', classification: 'MUTABLE', tree: 'public/gallery/media/', pattern: '[a-z0-9-]+/[a-z0-9-]+\\.(jpg|jpeg|png|gif|webp|avif)', owners: ['public/admin/js/features/gallery/gallery.js'] },
  { id: 'navigation', classification: 'MUTABLE', exact: 'public/site/data/site-navigation.json', owners: ['public/admin/js/features/site-navigation/site-navigation.js'] },
  { id: 'sitemap', classification: 'GENERATED', exact: 'sitemap.xml', shared: true, owners: ['scripts/events/event-seo.mjs', 'scripts/news/news-seo.mjs', 'scripts/residents/resident-seo.mjs'] },
  ...['scripts/', 'tests/', 'docs/', '.github/', 'docker/', 'assets/', 'public/admin/', 'public/resident-portal/', 'public/site/js/', 'public/gallery/js/'].map(tree => ({
    id: `code:${tree}`, classification: 'CODE', tree, owners: ['repository-code-review']
  })),
  ...['index.html', 'event.html', 'residents.html', 'gallery.html', 'history.html', 'robots.txt', 'robots.staging.txt', 'robots.live.txt', 'sitemap.live.xml', 'package.json'].map(exact => ({
    id: `code:${exact}`, classification: 'CODE', exact, owners: ['repository-code-review']
  }))
];

export const CONTENT_MANIFEST = Object.freeze({
  version: 1,
  rules: Object.freeze(rules.map(rule => Object.freeze({ ...rule, owners: Object.freeze(rule.owners) })))
});
