import { setStatus } from '../core/dom.js';
import { state, requireResident } from '../core/state.js';
import { saveResident } from '../core/github.js';
import * as profile from './profile.js';
import * as links from './links.js';
import * as news from './news.js';
import * as media from './media.js';
import * as releases from './releases.js';

export function readAll() {
  profile.read();
  links.read();
  news.read();
  media.read();
  releases.read();
  return requireResident();
}

export function initSave() {
  document.getElementById('saveBtn')?.addEventListener('click', async () => {
    if (!state.token) {
      setStatus('GitHub Token fehlt. Bitte neu einloggen.', 'warn');
      return;
    }
    try {
      setStatus('Speichere nach GitHub...', 'warn');
      const resident = readAll();
      await saveResident(state.token, resident);
      setStatus('Gespeichert.', 'ok');
    } catch (error) {
      setStatus(error.message || 'Speichern fehlgeschlagen.', 'danger');
    }
  });

  document.getElementById('draftBtn')?.addEventListener('click', () => {
    const resident = readAll();
    localStorage.setItem('residentPortalDraft:' + (resident.id || 'resident'), JSON.stringify({
      timestamp: new Date().toISOString(),
      resident
    }));
    setStatus('Entwurf lokal gespeichert.', 'ok');
  });
}
