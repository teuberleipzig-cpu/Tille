import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planContentBootstrap, validateContentCommit } from './bootstrap-plan.mjs';

export function parseBootstrapArguments(argv) {
  const options = {};
  const values = new Map([['--environment', 'environment'], ['--source-sha', 'sourceSha'],
    ['--content-sha', 'contentSha'], ['--content-ref', 'contentRef']]);
  const flags = new Map([['--dry-run', 'dryRun'], ['--validate', 'validate'], ['--inventory', 'inventory']]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const key = values.get(flag) || flags.get(flag);
    if (!key || Object.hasOwn(options, key)) throw new Error('Unbekanntes oder doppeltes CLI-Argument. Nur Dry-Run/Validation unterstützt.');
    if (values.has(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) throw new Error('CLI-Argument benötigt einen Wert.');
      options[key] = value;
    } else options[key] = true;
  }
  if (Boolean(options.dryRun) === Boolean(options.validate)) throw new Error('Genau --dry-run oder --validate erforderlich.');
  if (options.dryRun && (!options.sourceSha || options.contentSha || options.contentRef)) throw new Error('Dry-Run benötigt ausschließlich --source-sha und --environment.');
  if (options.validate && (!options.contentSha || !options.contentRef || options.sourceSha)) throw new Error('Validation benötigt --content-sha, --content-ref und --environment.');
  return options;
}

export function bootstrapReport(options) {
  const plan = options.validate ? validateContentCommit(options) : planContentBootstrap(options);
  const { files, excluded, ...summary } = plan;
  return options.inventory ? { ...summary, files, excluded } : summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(bootstrapReport(parseBootstrapArguments(process.argv.slice(2))), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
