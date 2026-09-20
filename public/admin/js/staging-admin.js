/* Admin-only bridge. Global API is required by the existing classic-script editors. */
(function () {
  const module = import('./core/staging-operation.js?v=admin-staging-1');
  let active = 0;
  const pending = new Map();
  const value = id => document.getElementById(id)?.value?.trim() || '';
  function notice(message, type = 'warn') {
    const el = document.getElementById('adminStagingStatus');
    if (el) { el.textContent = message; el.className = 'status ' + type; }
  }
  function capture() {
    return Object.freeze({ environment: value('adminEnvironment'), contentRef: value('ghBranch'),
      owner: value('ghOwner'), repo: value('ghRepo'), token: value('ghToken') });
  }
  function client(scope, subject, config = capture()) {
    let operation;
    const mediaScope = scope === 'resident-media' ? 'resident' : scope === 'event-media' ? 'event' : scope;
    let parentChecked = false;
    const get = () => operation || (operation = module.then(m => m.createStagingOperation(config, { scope, subject })));
    async function invoke(method, ...args) {
      active++;
      const select = document.getElementById('adminEnvironment'); if (select) select.disabled = true;
      try {
        const op = await get();
        if (!parentChecked) {
          const context = await op.bind();
          if (pending.has(mediaScope) && pending.get(mediaScope) !== context.contentSha) throw new Error('Medium bereits gespeichert; Staging wurde danach verändert. Bitte neu laden.');
          parentChecked = true;
        }
        notice('Staging · content/staging · ' + (method.startsWith('get') || method === 'bind' ? 'Laden…' : 'Vorgang läuft…'));
        const result = await op[method](...args);
        if (['putBase64File', 'deleteFile'].includes(method) && ['resident-media', 'event-media', 'gallery'].includes(scope)) {
          pending.set(mediaScope, (await op.bind()).contentSha);
          notice('Medium in Staging gespeichert. Die zugehörige JSON-Änderung muss noch gespeichert werden.', 'warn');
        }
        return result;
      } catch (error) {
        if (error.contentSaved || pending.has(mediaScope)) {
          error.message = 'Medien/Content teilweise bereits gespeichert. Nicht automatisch bereinigen. ' + error.message;
          notice(error.message, 'warn');
        }
        throw error;
      } finally { active--; if (select) select.disabled = active > 0; }
    }
    const api = Object.fromEntries(['bind', 'assertFresh', 'getFile', 'getTextFile', 'commitFiles', 'putTextFile', 'putBase64File', 'deleteFile']
      .map(method => [method, (...args) => invoke(method, ...args)]));
    api.requireMediaParent = async () => {
      const ctx = await api.bind();
      if (pending.has(scope) && pending.get(scope) !== ctx.contentSha) throw new Error('Medium bereits gespeichert; Staging wurde danach verändert. Bitte neu laden, nicht automatisch bereinigen.');
    };
    api.finish = async () => {
      const result = await invoke('finish', { dispatch: true });
      if (scope === 'resident' || scope === 'event') pending.delete(scope);
      notice((pending.has(mediaScope) ? 'Medien gespeichert; JSON-Entwurf noch speichern. ' : '') + result.message, pending.has(mediaScope) || result.status === 'deploy-failed' ? 'warn' : 'ok');
      return result;
    };
    return Object.freeze(api);
  }
  function resetPending(scope) { pending.delete(scope); }
  window.AdminStaging = Object.freeze({ client, capture, notice, resetPending,
    failureMessage: (scope, error) => (pending.has(scope) ? 'Medien bereits gespeichert; JSON-Save nicht abgeschlossen. Keine automatische Bereinigung. ' : '') + error.message,
    draftKey: kind => {
      if (value('adminEnvironment') !== 'staging') throw new Error('Staging auswählen, bevor ein Entwurf gespeichert wird.');
      return `distillery-admin-v2-staging-content-staging-${kind}-draft`;
    } });
  document.getElementById('adminEnvironment')?.addEventListener('change', () => {
    if (active) return;
    pending.clear();
    document.dispatchEvent(new Event('admin-staging-source-change'));
    if (value('adminEnvironment') === 'staging') window.AdminStagingLoads?.all();
    else notice('Bitte Staging auswählen. Live ist noch nicht aktiviert.', 'warn');
  });
})();
