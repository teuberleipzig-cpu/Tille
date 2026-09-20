import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const inside = (root, target) => target.startsWith(root + path.sep);

export function prepareCompositionOutput(repoRoot, output) {
  if (typeof output !== 'string' || !path.isAbsolute(output)) throw new Error('Explizites absolutes temporäres Outputziel erforderlich.');
  const target = path.resolve(output);
  let ancestor = target;
  while (true) {
    if (existsSync(ancestor) && lstatSync(ancestor).isSymbolicLink()) throw new Error('Output darf keine Symlink-Vorfahren haben.');
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const parent = realpathSync(path.dirname(target));
  const resolved = path.join(parent, path.basename(target));
  const repo = realpathSync(repoRoot);
  const tempRoots = [os.tmpdir(), process.env.RUNNER_TEMP].filter(Boolean).map(root => realpathSync(root));
  if (resolved === repo || inside(repo, resolved) || inside(resolved, repo)
    || !tempRoots.some(root => inside(root, resolved))) throw new Error('Output muss temporär und außerhalb des Repositorys liegen.');
  if (existsSync(resolved)) {
    if (!lstatSync(resolved).isDirectory() || readdirSync(resolved).length) throw new Error('Outputziel muss leer sein.');
  } else mkdirSync(resolved);
  return resolved;
}
