import { resolveEnvironment } from './environment.js?v=staging-writer-1';
export const PORTAL_VERSION = 'staging-writer-1';
const params = new URLSearchParams(window.location.search);
export const residentParam = params.get('resident') || '';
export const inviteParam = params.get('invite') || '';
let environment;
let error = '';
try { environment = resolveEnvironment(window.location.hostname, window.location.search); }
catch (cause) { error = cause.message; }
export const CONFIG = Object.freeze({
  owner: 'teuberleipzig-cpu', repo: 'Tille',
  residentsPath: 'public/residents/data/residents.json', ...environment, error
});
