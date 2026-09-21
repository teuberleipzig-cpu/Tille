import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { composeSite } from '../content/site-composition.mjs';
import { prepareFileMakerEvent } from './filemaker-event-intake.mjs';
import { assertWriterPaths } from './staging-contract.mjs';

async function inventory(root, relative = '') {
  const result = new Map();
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const item of await inventory(root, name)) result.set(...item);
    } else if (entry.isFile()) {
      result.set(name, createHash('sha256').update(await readFile(path.join(root, name))).digest('hex'));
    } else throw new Error('Unsupported entry in FileMaker temporary workspace.');
  }
  return result;
}

export async function prepareStagingWorkspace({ repoRoot, output, binding, operation, eventJson }) {
  // Uses only the two immutable snapshots. Never executes code from the content ref.
  composeSite({ repoRoot, output, ...binding });
  const before = await inventory(output);
  const result = await prepareFileMakerEvent({ mode: binding.mode, operation, eventJson, workspaceRoot: output });
  if (result.eventId !== binding.eventId) throw new Error('FileMaker payload identity changed.');
  assertWriterPaths(binding, result.changedFiles);
  const after = await inventory(output);
  const actual = [...new Set([...before.keys(), ...after.keys()])].filter(file => before.get(file) !== after.get(file)).sort();
  const expected = binding.mode === 'sync-pr' ? [...result.changedFiles].sort() : [];
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Unexpected FileMaker workspace changes.');
  assertWriterPaths(binding, actual);
  return { hasChanges: result.hasChanges, changedFiles: result.changedFiles, eventId: result.eventId,
    operation: result.operation, branch: binding.branch, workspace: output };
}
