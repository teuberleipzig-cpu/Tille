// Unwired V2 field patch contract. This is NOT a complete FileMaker payload parser.
import { MAX_PAYLOAD_BYTES } from '../filemaker-event-model.mjs';
import { contractObject } from './text.mjs';
import { normalizeDatePatch } from './dates.mjs';
import { normalizeTags } from './tags.mjs';
import { normalizeTimetable } from './timetable.mjs';

export const EVENT_CONTRACT_VERSION = 2;

export function validateEnvironment(value) {
  if (value !== 'staging' && value !== 'live') {
    throw new Error('environment: exakt staging oder live erforderlich.');
  }
  return value;
}

export function assertPayloadBudget(eventJson) {
  if (typeof eventJson !== 'string') throw new Error('event_json: JSON-Text erforderlich.');
  if (Buffer.byteLength(eventJson, 'utf8') > MAX_PAYLOAD_BYTES) {
    throw new Error('event_json: maximal 40 KB UTF-8.');
  }
}

export function normalizeEventV2Patch(input) {
  contractObject(input, ['date', 'dates', 'tags', 'timetable'], 'V2-Feldpatch');
  assertPayloadBudget(JSON.stringify(input));
  const patch = normalizeDatePatch(input);
  if (Object.hasOwn(input, 'tags')) patch.tags = normalizeTags(input.tags);
  if (Object.hasOwn(input, 'timetable')) patch.timetable = normalizeTimetable(input.timetable);
  return patch;
}
