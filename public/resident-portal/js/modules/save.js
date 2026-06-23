import { setStatus } from '../core/dom.js';
import { state, requireResident } from '../core/state.js';
import { saveResident } from '../core/github.js';
import * as profile from './profile.js';
import * as links from './links.js';
import * as news from './news.js?v=news-top-save-2';
import * as media from './media.js?v=media-preview-map-1';
import * as releases from './releases.js?v=cover-preview-1';

export function readAll() {
  profile.read();
  links.read();
  news.readSorted();
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
      news.render();
      setStatus('Gespeichert. News wurden nach Datum sortiert.', 'ok');
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
    news.render();
    setStatus('Entwurf lokal gespeichert. News wurden nach Datum sortiert.', 'ok');
  });
}
