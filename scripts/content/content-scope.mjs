import { CONTENT_MANIFEST } from './content-manifest.mjs';
import { bindContentEnvironment } from './environments.mjs';

// Canonical POSIX repo paths only. Reject ambiguity instead of rewriting it.
export function assertRepoPath(path) {
  if (typeof path !== 'string' || !path || /[^A-Za-z0-9._/-]/.test(path)) {
    throw new Error('Repo-Pfad muss ein kanonischer relativer POSIX-Pfad sein.');
  }
  const parts = path.split('/');
  if (parts.some(part => !part || part === '.' || part === '..' || part.endsWith('.') || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part))) {
    throw new Error('Repo-Pfad enthält ein ungültiges oder mehrdeutiges Segment.');
  }
  return path;
}

function matches(rule, path) {
  if (rule.exact) return path === rule.exact;
  if (!path.startsWith(rule.tree)) return false;
  const relative = path.slice(rule.tree.length);
  return Boolean(relative) && (!rule.pattern || new RegExp(`^(?:${rule.pattern})$`).test(relative));
}

export function classifyContentPath(path) {
  assertRepoPath(path);
  const matching = CONTENT_MANIFEST.rules.filter(rule => matches(rule, path));
  if (matching.length > 1) throw new Error('Mehrdeutige Content-Klassifikation.');
  return matching[0] || null;
}

export function validateContentChanges({ environment, contentRef, paths }) {
  const config = bindContentEnvironment(environment, contentRef);
  if (!Array.isArray(paths)) throw new Error('Änderungspfade müssen als Array übergeben werden.');
  const accepted = [], rejected = [];
  // Indexed iteration also rejects sparse entries; no supplied path is ignored.
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    try {
      const rule = classifyContentPath(path);
      if (!rule || rule.classification === 'CODE') {
        rejected.push({ index, path, reason: rule ? 'Code ist auf Content-Refs verboten.' : 'Unbekannter Content-Pfad.' });
      } else accepted.push({ path, ruleId: rule.id, classification: rule.classification });
    } catch (error) {
      rejected.push({ index, path, reason: error.message });
    }
  }
  return { environment: config.environment, contentRef: config.contentRef, valid: rejected.length === 0, empty: paths.length === 0, accepted, rejected };
}
