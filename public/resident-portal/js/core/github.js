import { CONFIG, inviteParam, residentParam } from './config.js?v=staging-writer-1';
import { assertWritable } from './environment.js?v=staging-writer-1';
import { selectTarget } from './resident-patch.js?v=staging-writer-1';
import { loginSession } from './portal-session.js?v=staging-writer-1';
import { state, markClean } from './state.js';
let session;
const selector = Object.freeze({ id: residentParam, invite: inviteParam });
export function validateSaveBranch() {
  if (CONFIG.error) throw new Error(CONFIG.error);
  assertWritable(CONFIG);
  return CONFIG.contentRef;
}
export async function loadPublicResidents() {
  validateSaveBranch();
  const response = await fetch('../residents/data/residents.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Residents-Daten konnten nicht geladen werden.');
  return response.json();
}
export function selectResident(data) {
  const resident = selectTarget(data, selector);
  state.data = data;
  state.resident = structuredClone(resident);
  state.residentIndex = data.residents.indexOf(resident);
  return state.resident;
}
export async function authenticateResident(preload, code, token) {
  validateSaveBranch();
  session = undefined;
  const next = await loginSession(CONFIG, selector, preload, code, token);
  state.resident = next.resident;
  state.selectedReleaseIndex = 0;
  session = next;
}
export function portalSession() {
  validateSaveBranch();
  if (!session) throw new Error('Bitte zuerst mit GitHub-Token einloggen.');
  return session;
}
export async function saveResident(_token, nextResident) {
  const result = await portalSession().save(structuredClone(nextResident));
  markClean();
  return result;
}
