import { CONTENT_MANIFEST } from './content-manifest.mjs';
import { assertRepoPath } from './content-scope.mjs';

// Tree rules own their complete namespace, not only the accepted filename pattern.
// Exact rules own one file unless the central manifest explicitly says otherwise.
export function replacementScope(manifest = CONTENT_MANIFEST) {
  const content = manifest.rules.filter(rule => rule.classification !== 'CODE');
  const roots = [...new Set(content.flatMap(rule => [rule.tree, rule.replacementTree].filter(Boolean)))].sort();
  for (const root of roots) {
    assertRepoPath(root.slice(0, -1));
    if (!root.endsWith('/')) throw new Error('Replacement-Tree benötigt abschließenden Slash.');
    for (const rule of manifest.rules.filter(rule => rule.classification === 'CODE')) {
      if (rule.tree ? root.startsWith(rule.tree) || rule.tree.startsWith(root)
        : rule.exact.startsWith(root) || root.startsWith(rule.exact + '/')) {
        throw new Error('Gemischter CODE-/Content-Namespace: präzisere Ownership erforderlich.');
      }
    }
  }
  const exact = new Set(content.filter(rule => rule.exact).map(rule => rule.exact));
  return path => exact.has(path) || roots.some(root => path.startsWith(root) || path === root.slice(0, -1));
}
