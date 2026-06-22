export const PORTAL_VERSION = 'portal-modular-1';

export const CONFIG = {
  owner: 'teuberleipzig-cpu',
  repo: 'Tille',
  branch: 'main',
  residentsPath: 'public/residents/data/residents.json'
};

export const params = new URLSearchParams(window.location.search);
export const residentParam = params.get('resident') || '';
export const inviteParam = params.get('invite') || '';
