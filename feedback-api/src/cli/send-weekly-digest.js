import fs from 'node:fs/promises';
import { loadConfig } from '../config.js';
import { TrelloProvider } from '../board/trello-provider.js';
import { UnconfiguredMailProvider } from '../mail/mail-provider.js';
import { runDigest } from '../digest/weekly-digest.js';
const config = loadConfig();
if (!config.digest.statePath || !config.digest.recipient) throw new Error('Digest state path and recipient must be configured');
let since; try { since = (await fs.readFile(config.digest.statePath, 'utf8')).trim(); } catch { since = new Date(0).toISOString(); }
await runDigest({ boardProvider: new TrelloProvider(config.trello), mailProvider: new UnconfiguredMailProvider(), since, recipient: config.digest.recipient });
