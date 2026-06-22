export const state = {
  data: null,
  resident: null,
  residentIndex: -1,
  token: '',
  dirty: false,
  selectedReleaseIndex: 0
};

window.portalResidentState = state;

export function setToken(token) {
  state.token = String(token || '').trim();
  if (state.token) sessionStorage.setItem('residentPortalToken', state.token);
}

export function rememberTokenLocally(token) {
  const value = String(token || '').trim();
  if (value) localStorage.setItem('residentPortalToken', value);
}

export function getStoredToken() {
  return sessionStorage.getItem('residentPortalToken') || localStorage.getItem('residentPortalToken') || '';
}

export function markDirty() {
  state.dirty = true;
}

export function markClean() {
  state.dirty = false;
}

export function requireResident() {
  if (!state.resident) throw new Error('Resident ist noch nicht geladen.');
  return state.resident;
}
