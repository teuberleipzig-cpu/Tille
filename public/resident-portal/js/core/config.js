export const PORTAL_VERSION = 'portal-modular-1';

export const params = new URLSearchParams(window.location.search);
export const residentParam = params.get('resident') || '';
export const inviteParam = params.get('invite') || '';
export const branchParam = params.has('branch') ? (params.get('branch') || '') : 'main';

export const CONFIG = {
  owner: 'teuberleipzig-cpu',
  repo: 'Tille',
  branch: branchParam,
  residentsPath: 'public/residents/data/residents.json'
};
