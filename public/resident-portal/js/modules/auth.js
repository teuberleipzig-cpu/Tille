import { $, setStatus, showScreen } from '../core/dom.js';
import { CONFIG, hasExplicitBranchParam } from '../core/config.js?v=branch-reload-2';
import { getStoredToken, setToken } from '../core/state.js';
import { loadPublicResidents, loadResidentsFromGithub, selectResident } from '../core/github.js?v=branch-reload-2';

function normalizedCode(value) {
  return String(value || '').replace(/[\s-]/g, '').toUpperCase();
}

function codeMatches(resident, typedCode) {
  const expected = normalizedCode(resident.portal?.code || '');
  const actual = normalizedCode(typedCode);
  return Boolean(expected && actual && expected === actual);
}

export async function loadResidentForLogin() {
  const data = await loadPublicResidents();
  const resident = selectResident(data);
  $('loginResidentName').textContent = resident.name || resident.id || 'Resident';
  return resident;
}

export function initAuth(onLogin) {
  const token = getStoredToken();
  if (token && $('githubToken')) $('githubToken').value = token;

  $('loginBtn')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    if (button.disabled) return;
    setStatus('Login wird geprüft...', 'warn');
    try {
      const resident = window.portalResidentState.resident;
      if (!resident) throw new Error('Resident ist noch nicht geladen. Seite neu laden.');
      if (!codeMatches(resident, $('accessCode').value)) throw new Error('Code falsch. Erwartet wird der aktuelle Code aus dem Admin.');
      const enteredToken = String($('githubToken').value || '').trim();
      if (!enteredToken) throw new Error('GitHub-Token-Feld ist leer.');
      if (hasExplicitBranchParam) {
        if (!CONFIG.branch) throw new Error('Bitte GitHub-Branch angeben.');
        button.disabled = true;
        setStatus(`Lade Resident aus GitHub-Branch ${CONFIG.branch} ...`, 'warn');
        const fresh = await loadResidentsFromGithub(enteredToken);
        selectResident(fresh.data);
      }
      setToken(enteredToken);
      onLogin();
      showScreen('editorScreen');
      setStatus('Eingeloggt.', 'ok');
    } catch (error) {
      showScreen('loginScreen');
      setStatus(error.message || 'Login fehlgeschlagen.', 'danger');
    } finally {
      button.disabled = false;
    }
  });
}
