import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { readGit } from './git-snapshot.mjs';

function assertDiskPath(value) {
  // Code filenames may contain spaces (e.g. existing image assets).
  if (typeof value !== 'string' || !value || /[\\\x00-\x1f\x7f:<>"|?*]/.test(value)) throw new Error('Unsicherer Snapshot-Pfad.');
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part)
      || /^(\.git|\.env(?:\..*)?|con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)
      || /^(id_rsa|id_ed25519)$|\.(pem|p12|pfx|key)$/i.test(part)) {
      throw new Error('Verbotener oder mehrdeutiger Snapshot-Pfad.');
    }
  }
}

export function assertMaterializableEntries(entries) {
  const names = new Set();
  for (const entry of entries) {
    assertDiskPath(entry.path);
    if (entry.type !== 'blob' || !['100644', '100755'].includes(entry.mode)) {
      throw new Error('Snapshot enthält Symlink/Gitlink oder unerlaubten Mode.');
    }
    const key = entry.path.toLowerCase();
    if (names.has(key)) throw new Error('Snapshot-Pfadkollision.');
    names.add(key);
  }
  for (const name of names) {
    const segments = name.split('/');
    while (segments.length > 1) {
      segments.pop();
      if (names.has(segments.join('/'))) throw new Error('Snapshot-Datei-/Verzeichniskollision.');
    }
  }
  if (process.platform === 'win32' && entries.some(entry => entry.mode === '100755')) {
    throw new Error('Executable-Code-Modes können auf Windows nicht sicher erhalten werden.');
  }
}

export function assertNoSecrets(bytes) {
  const text = bytes.toString('utf8');
  if (/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) {
    throw new Error('Mögliches Secret im Snapshot; Materialisierung abgebrochen (Inhalt nicht geloggt).');
  }
}

function readBlobBatch(repoRoot, entries) {
  const bytes = readGit(repoRoot, ['cat-file', '--batch'], entries.map(entry => entry.sha).join('\n') + '\n');
  let offset = 0;
  return entries.map(entry => {
    const newline = bytes.indexOf(10, offset);
    const header = bytes.subarray(offset, newline).toString('ascii');
    const match = /^([a-f0-9]{40}) blob ([0-9]+)$/.exec(header);
    if (!match || match[1] !== entry.sha) throw new Error('Unerwartete Blob-Antwort.');
    const start = newline + 1, end = start + Number(match[2]);
    if (end >= bytes.length || bytes[end] !== 10) throw new Error('Unvollständiger Blob.');
    offset = end + 1;
    return bytes.subarray(start, end);
  });
}

export function materializeSnapshot(repoRoot, output, entries) {
  assertMaterializableEntries(entries);
  for (let index = 0; index < entries.length; index += 16) {
    const batch = entries.slice(index, index + 16);
    const blobs = readBlobBatch(repoRoot, batch);
    for (let i = 0; i < batch.length; i += 1) {
      assertNoSecrets(blobs[i]);
      const destination = path.join(output, ...batch[i].path.split('/'));
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, blobs[i], { flag: 'wx', mode: batch[i].mode === '100755' ? 0o755 : 0o644 });
      chmodSync(destination, batch[i].mode === '100755' ? 0o755 : 0o644);
    }
  }
}
