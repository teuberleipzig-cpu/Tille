/* Staging-only load/save adapters for the classic Admin UI; no public/main fallback. */
(function () {
  const modules = Promise.all([
    import('./core/event-storage-admin.js?v=event-storage-admin-2'),
    import('./core/event-image-only-save.js?v=event-image-only-save-2'),
    import('./core/resident-fresh-patch.js?v=admin-staging-1')
  ]);
  const RESIDENTS = 'public/residents/data/residents.json';
  const MANIFEST = 'public/events/data/manifest.json';
  let baseline = null, rawBaseline = null;
  const clone = value => structuredClone(value);
  function loadedResidents(raw) {
    state.residentsData = clone(raw); ensureResidents();
    state.loadedResidentCount = raw.residents.length;
    rawBaseline = clone(raw); baseline = clone(residents());
  }
  async function loadMonthlyEvents(client) {
    const [{ loadMonthlyEventDocument }] = await modules;
    const context = await client.bind(), cache = new Map();
    const read = file => {
      if (!cache.has(file)) cache.set(file, client.getTextFile(file).then(result => JSON.parse(result.text)));
      return cache.get(file);
    };
    const json = await loadMonthlyEventDocument(read, MANIFEST);
    const sitemap = (await client.getTextFile('sitemap.xml')).text;
    await client.assertFresh();
    return { json, manifest: await read(MANIFEST), sitemap, head: context.contentSha };
  }
  function finishLoad(residentLoaded = false) {
    state.syncState = 'loaded'; state.dirty = false;
    renderAll(); updateSaveStatus();
    // Capture the view after the existing render-time normalizers.
    if (residentLoaded && rawBaseline) baseline = clone(residents());
  }
  async function loadEventsPublic() {
    try {
      setStatus('eventEditStatus', 'Lade Events aus Staging…', 'warn');
      const client = window.AdminStaging.client('event', 'load');
      const fresh = await loadMonthlyEvents(client);
      state.eventsData = fresh.json; state.eventsManifest = fresh.manifest;
      state.eventsHead = state.eventsSha = fresh.head; state.loadedEventCount = fresh.json.events.length;
      ensureEvents(); state.selectedEvent = fresh.json.events.length ? 0 : -1;
      window.AdminStaging.resetPending('event'); finishLoad();
      setStatus('eventEditStatus', 'Events aus content/staging geladen.', 'ok');
    } catch (error) { setStatus('eventEditStatus', error.message, 'err'); }
  }
  async function loadResidentsPublic() {
    try {
      setStatus('residentStatus', 'Lade Residents aus Staging…', 'warn');
      const client = window.AdminStaging.client('resident');
      const fresh = await client.getTextFile(RESIDENTS); await client.assertFresh();
      const document = JSON.parse(fresh.text);
      if (!Array.isArray(document.residents) || !document.residents.length) throw new Error('Residents-Datensatz ist leer oder ungültig.');
      loadedResidents(document); state.residentsSha = fresh.sha;
      state.selectedResident = document.residents.length ? 0 : -1;
      window.AdminStaging.resetPending('resident'); finishLoad(true);
      setStatus('residentStatus', 'Residents aus content/staging geladen.', 'ok');
    } catch (error) { setStatus('residentStatus', error.message, 'err'); }
  }
  async function all() { await loadEventsPublic(); await loadResidentsPublic(); }
  async function saveEventsStay() {
    try {
      const selected = currentEvent();
      if (!selected) throw new Error('Bitte zuerst ein Event auswählen.');
      const target = clone(selected), requestedImageUrl = $('evImageUrl').value.trim();
      const config = window.AdminStaging.capture();
      const [, { saveEventImageOnly, eventImageTargetId }] = await modules;
      const targetEventId = eventImageTargetId(target);
      if (!targetEventId) throw new Error('Stabile Event-ID fehlt.');
      const client = window.AdminStaging.client('event', targetEventId, config);
      setStatus('eventEditStatus', 'Speichere Eventbild nach content/staging…', 'warn');
      await client.requireMediaParent();
      const saved = await saveEventImageOnly({ targetEventId, requestedImageUrl, writer: client,
        loadFresh: async () => {
          const fresh = await loadMonthlyEvents(client);
          return { document: fresh.json, manifest: fresh.manifest, sitemap: fresh.sitemap, head: fresh.head };
        } });
      state.eventsData = saved.document; state.eventsManifest = saved.manifest;
      state.eventsHead = state.eventsSha = saved.commit; state.selectedEvent = saved.eventIndex;
      state.dirty = false; state.syncState = 'loaded'; renderAll();
      const result = await client.finish();
      setStatus('eventEditStatus', result.message, result.status === 'deploy-failed' ? 'warn' : 'ok');
    } catch (error) { state.syncState = 'conflict'; updateSaveStatus(); setStatus('eventEditStatus', window.AdminStaging.failureMessage('event', error), 'err'); }
  }
  async function saveResidentsStay() {
    try {
      if (!baseline || !rawBaseline) throw new Error('Residents zuerst aus Staging laden.');
      readResidentForm(); ensureResidents();
      const draft = clone(residents()), original = clone(baseline), raw = clone(rawBaseline);
      const allowLoss = $('allowResidentLoss')?.checked === true;
      const client = window.AdminStaging.client('resident');
      setStatus('residentStatus', 'Speichere Residents nach content/staging…', 'warn');
      await client.requireMediaParent();
      const [, , { patchResidentDocument }] = await modules;
      const fresh = await client.getTextFile(RESIDENTS);
      const next = patchResidentDocument({ baseline: original, rawBaseline: raw, draft, fresh: JSON.parse(fresh.text), allowLoss });
      const result = await client.putTextFile(RESIDENTS, JSON.stringify(next, null, 2) + '\n', fresh.sha, 'Update residents data from staging admin');
      state.residentsSha = result.content.sha;
      loadedResidents(next); state.dirty = false; state.syncState = 'loaded'; renderAll(); baseline = clone(residents());
      const deployment = await client.finish();
      setStatus('residentStatus', deployment.message, deployment.status === 'deploy-failed' ? 'warn' : 'ok');
    } catch (error) { state.syncState = 'conflict'; updateSaveStatus(); setStatus('residentStatus', window.AdminStaging.failureMessage('resident', error), 'err'); }
  }
  window.AdminStagingActions = Object.freeze({ loadEvents: loadEventsPublic, loadResidents: loadResidentsPublic, saveEvent: saveEventsStay, saveResidents: saveResidentsStay });
  window.AdminStagingLoads = Object.freeze({ all, adoptResidents: document => { loadedResidents(document); baseline = clone(residents()); } });
  window.loadEventsFromGithub = loadEventsPublic; window.loadResidentsFromGithub = loadResidentsPublic;
  window.saveEventsToGithub = saveEventsStay; window.saveResidentsToGithub = saveResidentsStay;
  for (const id of ['eventSaveBtn']) if ($(id)) $(id).onclick = saveEventsStay;
  for (const id of ['saveResidentsGitBtn', 'saveResidentsGitBtn2']) if ($(id)) $(id).onclick = saveResidentsStay;
  if ($('loadEventsGitBtn')) $('loadEventsGitBtn').onclick = loadEventsPublic;
  if ($('loadResidentsGitBtn')) $('loadResidentsGitBtn').onclick = loadResidentsPublic;
  if ($('topLoadBtn')) $('topLoadBtn').onclick = () => state.view === 'residents' || state.view === 'releases' ? loadResidentsPublic() : loadEventsPublic();
  if ($('topSaveBtn')) $('topSaveBtn').onclick = () => state.view==='residents'||state.view==='releases'?saveResidentsStay():state.view==='events'?saveEventsStay():undefined;
  if ($('saveEventsGitBtn')) $('saveEventsGitBtn').onclick = () => setStatus('syncStatus', 'Bitte Eventbild im Event-Editor speichern.', 'warn');
  document.addEventListener('admin-staging-source-change', () => { baseline = rawBaseline = null; state.eventsSha = state.eventsHead = state.residentsSha = ''; });
  window.applyEventImageOnlyUi?.();
})();
