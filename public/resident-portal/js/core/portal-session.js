import { assertWritable } from './environment.js?v=staging-writer-1';
import { clone, selectTarget, validateLogin, patchResident } from './resident-patch.js?v=staging-writer-1';
import { createTransport, RESIDENTS_PATH, encodeText } from './git-transport.js?v=staging-writer-1';
import { mediaPath, slug } from './media-scope.js?v=staging-writer-1';
export async function loginSession(environment, selector, preload, code, token, fetcher) {
  assertWritable(environment);
  const transport = createTransport(token, fetcher);
  const contentSha = await transport.head('content/staging');
  const data = await transport.residents(contentSha);
  const resident = selectTarget(data, selector);
  validateLogin(preload, resident, code);
  await transport.check(contentSha);
  const context = Object.freeze({ environment: environment.environment, contentRef: environment.contentRef,
    id: resident.id, invite: selector.invite || '' });
  return boundSession(context, contentSha, resident, token, transport);
}
function boundSession(context, contentSha, resident, token, transport) {
  let rawBaseline = clone(resident);
  let viewBaseline;
  let busy = false;
  let failed = false;
  let mediaPending = false;
  async function operation(action) {
    assertWritable(context);
    if (failed) throw new Error('Sitzung muss nach einem Schreibfehler neu geladen werden.');
    if (busy) throw new Error('Portal-Vorgang läuft bereits.');
    busy = true;
    try { return await action(); }
    catch (error) { failed = true; throw error; }
    finally { busy = false; }
  }
  async function fresh() {
    await transport.check(contentSha);
    const latest = await transport.residents(contentSha);
    selectTarget(latest, context);
    return latest;
  }
  async function save(edited) {
    return operation(async () => {
      try {
        if (!viewBaseline) throw new Error('Portal-Formularbaseline fehlt.');
        const latest = await fresh();
        const patched = patchResident(latest, context, rawBaseline, viewBaseline, edited);
        if (JSON.stringify(patched).includes(token)) throw new Error('GitHub-Token darf nicht im Content gespeichert werden.');
        const changed = JSON.stringify(latest) !== JSON.stringify(patched);
        if (!changed && !mediaPending) return { changed: false, message: 'Keine Resident-Änderungen vorhanden.' };
        if (changed) contentSha = await transport.commit(contentSha, RESIDENTS_PATH,
          encodeText(JSON.stringify(patched, null, 2) + '\n'), `Update resident from staging portal: ${context.id}`);
        rawBaseline = clone(selectTarget(patched, context));
        viewBaseline = clone(edited);
        mediaPending = false;
      } catch (error) {
        if (mediaPending) throw new Error(`Medium wurde gespeichert, Resident-Daten konnten nicht gespeichert werden. Bitte neu laden; keine automatische Bereinigung. ${error.message}`);
        throw error;
      }
      try {
        const deployment = await transport.deployment(contentSha);
        return { changed: true, contentSha, deployment, message: 'Content gespeichert. Staging-Deployment angefordert.' };
      } catch {
        return { changed: true, contentSha, message: 'Content gespeichert. Staging-Deployment konnte nicht gestartet werden. Actions-Berechtigung und SHA-Gates prüfen; kein automatischer Retry.' };
      }
    });
  }
  async function media(value, content) {
    const path = mediaPath(value, context.id);
    return operation(async () => {
      const latest = await fresh();
      if (latest.residents.some(r => r.id !== context.id && slug(r.id) === slug(context.id))) throw new Error('Resident-Medienordner ist nicht eindeutig.');
      const next = await transport.commit(contentSha, path, content, `Update resident media from staging portal: ${context.id}`);
      mediaPending ||= next !== contentSha;
      contentSha = next;
      // Prepare the dual-SHA contract after media writes; dispatch only after JSON is consistent.
      try { await transport.prepareDeployment(contentSha); }
      catch { throw new Error('Medium wurde gespeichert. Deploymentvorbereitung fehlgeschlagen. Bitte neu laden; keine automatische Bereinigung.'); }
      return '/' + path.replace(/^public\//, '');
    });
  }
  return Object.freeze({ resident: clone(resident), context,
    setViewBaseline(view) { if (viewBaseline) throw new Error('Baseline bereits gebunden.'); viewBaseline = clone(view); },
    save, media, getContentSha: () => contentSha });
}
