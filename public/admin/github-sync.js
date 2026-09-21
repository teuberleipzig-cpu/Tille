/* Compatibility entrypoints only. Never retain a free-branch legacy writer. */
function stagingAction(name) {
  const action = window.AdminStagingActions?.[name];
  if (!action) { setStatus('syncStatus', 'Staging-Speicherlogik noch nicht bereit. Bitte erneut versuchen.', 'err'); return; }
  return action();
}
function loadEventsFromGithub(){ return stagingAction('loadEvents'); }
function loadResidentsFromGithub(){ return stagingAction('loadResidents'); }
function saveEventsToGithub(){ return stagingAction('saveEvent'); }
function saveResidentsToGithub(){ return stagingAction('saveResidents'); }
  
