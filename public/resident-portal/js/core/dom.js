export const $ = id => document.getElementById(id);

export function setStatus(message, type = 'muted') {
  const el = $('portalStatus');
  if (!el) return;
  el.textContent = message;
  el.className = 'status ' + type + ' portal-global-status';
}

export function showScreen(id) {
  document.querySelectorAll('[data-screen]').forEach(screen => screen.classList.add('hidden'));
  const target = $(id);
  if (target) target.classList.remove('hidden');
}

export function activateTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.add('hidden'));
  const panel = $('panel-' + tabName);
  if (panel) panel.classList.remove('hidden');
}

export function bindTabs() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    if (button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[char]));
}
