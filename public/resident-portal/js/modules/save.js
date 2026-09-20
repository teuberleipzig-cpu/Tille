import { setStatus } from '../core/dom.js';
import { state, requireResident } from '../core/state.js';
import { saveResident, portalSession } from '../core/github.js?v=staging-writer-1';
import { draftKey } from '../core/resident-patch.js?v=staging-writer-1';
import { withEditorOperation } from '../core/editor-operation.js?v=staging-writer-1';
import * as profile from './profile.js';
import * as links from './links.js';
import * as news from './news.js?v=staging-writer-1';
import * as media from './media.js?v=staging-writer-1';
import * as releases from './releases.js?v=staging-writer-1';
export function readAll(sort = false) {
  profile.read();
  links.read();
  if (sort) news.readSorted(); else news.read();
  media.read();
  releases.read();
  return requireResident();
}
export function initSave() {
  document.getElementById('saveBtn')?.addEventListener('click', async () => {
    try {
      await withEditorOperation(async () => {
        portalSession();
        setStatus('Speichere Resident nach Staging ...', 'warn');
        const resident = readAll(true);
        news.render();
        const result = await saveResident(state.token, resident);
        setStatus(result.message, result.deployment || !result.changed ? 'ok' : 'warn');
      });
    } catch (error) { setStatus(error.message || 'Speichern fehlgeschlagen.', 'danger'); }
  });
  document.getElementById('draftBtn')?.addEventListener('click', () => {
    try {
      const session = portalSession();
      const resident = readAll(true);
      localStorage.setItem(draftKey(session.context, resident.id), JSON.stringify({
        timestamp: new Date().toISOString(), resident
      }));
      news.render();
      setStatus('Staging-Entwurf lokal gespeichert. News wurden nach Datum sortiert.', 'ok');
    } catch (error) { setStatus(error.message, 'danger'); }
  });
}
