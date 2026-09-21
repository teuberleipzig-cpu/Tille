/* Temporary cutover gate. Reads only; never normalizes or mutates resident.portal. */
(function () {
  const MESSAGE = 'Resident-Zugangsverwaltung ist während der Staging-Migration vorübergehend deaktiviert. Bestehende Zugangsdaten bleiben erhalten. Die Funktion wird nach Migration des Resident-Portals wieder aktiviert.';
  function install() {
    const panel = document.getElementById('resident-tab-profile');
    if (!panel || document.getElementById('residentAccessBlock')) return;
    const block = document.createElement('section');
    block.id = 'residentAccessBlock'; block.className = 'resident-access-card section-card';
    const note = document.createElement('p'); note.textContent = MESSAGE; note.setAttribute('role', 'status'); block.append(note);
    for (const [id, label] of [['residentPortalEnabled','Zugang aktivieren/deaktivieren'], ['createResidentPortalAccess','Zugang erstellen'],
      ['regenResidentPortalCode','Code neu generieren'], ['regenResidentPortalInvite','Invite neu generieren'],
      ['copyResidentPortalLink','Portal-Link erzeugen/kopieren'], ['copyResidentPortalCode','Code kopieren']]) {
      const button = document.createElement('button'); button.id = id; button.type = 'button'; button.disabled = true; button.textContent = label; block.append(button);
    }
    const summary = document.createElement('p'); summary.id = 'residentAccessReadOnly'; block.append(summary);
    panel.append(block);
  }
  function render() {
    install();
    const resident = typeof currentResident === 'function' ? currentResident() : null;
    const target = document.getElementById('residentAccessReadOnly'); if (!target) return;
    const portal = resident?.portal;
    target.textContent = !portal ? 'Keine gespeicherten Zugangsdaten vorhanden.'
      : 'Gespeicherter Zugang: ' + (portal.enabled === true ? 'aktiv' : 'inaktiv') + ' · Invite vorhanden: ' + (portal.inviteId ? 'ja' : 'nein') + ' · Code vorhanden: ' + (portal.code ? 'ja' : 'nein');
  }
  function ready() {
    // The existing renderer owns the resident panel. Only append/update our scoped notice.
    if (!window.__residentAccessReadOnly && typeof window.renderResidentForm === 'function') {
      const previous = window.renderResidentForm;
      window.renderResidentForm = function () { const result = previous.apply(this, arguments); render(); return result; };
      window.__residentAccessReadOnly = true;
    }
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
