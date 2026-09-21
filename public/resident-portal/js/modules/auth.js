import { $, setStatus, showScreen } from '../core/dom.js';
import { getStoredToken, setToken, markClean } from '../core/state.js';
import { loadPublicResidents, selectResident, authenticateResident, portalSession } from '../core/github.js?v=staging-writer-1';
let preload;
export async function loadResidentForLogin() {
  const resident = selectResident(await loadPublicResidents());
  preload = structuredClone(resident);
  $('loginResidentName').textContent = resident.name || resident.id || 'Resident';
  return resident;
}
export function initAuth(onLogin, readBaseline) {
  const token = getStoredToken();
  if (token && $('githubToken')) $('githubToken').value = token;
  $('loginBtn')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    if (button.disabled) return;
    button.disabled = true;
    setStatus('Login wird frisch gegen Staging geprüft...', 'warn');
    try {
      if (!preload) throw new Error('Resident ist noch nicht geladen. Seite neu laden.');
      const enteredToken = String($('githubToken').value || '').trim();
      const code = $('accessCode').value;
      await authenticateResident(preload, code, enteredToken);
      onLogin();
      portalSession().setViewBaseline(readBaseline());
      setToken(enteredToken);
      markClean();
      showScreen('editorScreen');
      setStatus('Eingeloggt. Umgebung: Staging.', 'ok');
    } catch (error) {
      showScreen('loginScreen');
      setStatus(error.message || 'Login fehlgeschlagen.', 'danger');
    } finally { button.disabled = false; }
  });
}
