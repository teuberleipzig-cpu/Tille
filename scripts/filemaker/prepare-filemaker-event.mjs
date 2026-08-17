import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareFileMakerEvent } from './filemaker-event-intake.mjs';

function parseArguments(argv) {
  const options = { workspaceRoot: process.cwd() };
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--mode') options.mode = argv[++index];
    else if (argv[index] === '--operation') options.operation = argv[++index];
    else if (argv[index] === '--workspace') options.workspaceRoot = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  return options;
}

async function writeOutput(summary) {
  if (!process.env.GITHUB_OUTPUT) return;
  const values = {
    has_changes: summary.hasChanges, event_id: summary.eventId, operation: summary.operation,
    branch: summary.branch, action: summary.action, existed: summary.exists,
    before_month: summary.beforeMonth, after_month: summary.afterMonth,
    changed_files_count: summary.changedFilesCount,
    changed_files: summary.changedFiles.join(','), title: summary.title.replace(/[\r\n]/g, ' '), date: summary.date
  };
  await appendFile(process.env.GITHUB_OUTPUT, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`, 'utf8');
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const summary = await prepareFileMakerEvent({ ...options, eventJson: process.env.FILEMAKER_EVENT_JSON });
  await writeOutput(summary);
  console.log(`FileMaker Event Intake validation PASS: operation=${summary.operation}, id=${summary.eventId}, exists=${summary.exists}, before=${summary.beforeMonth || 'none'}, after=${summary.afterMonth || 'none'}, changed_files=${summary.changedFilesCount}, result=${summary.action}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
