import { createGitHubClient } from '../../core/github-client.js';
import { moveSitePage, normalizeSiteNavigation } from '../../../../site/js/site-navigation-model.js';

const PATH = 'public/site/data/site-navigation.json';
const root = document.getElementById('view-site-navigation');
const list = root?.querySelector('[data-site-navigation-list]');
const status = root?.querySelector('[data-site-navigation-status]');
let config = null;
let loadedSha = '';

function openView() {
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.view === 'site-navigation'));
  document.querySelectorAll('main>section').forEach(section => section.classList.add('hidden'));
  root.classList.remove('hidden');
  document.getElementById('viewTitle').textContent = 'Website';
  document.getElementById('viewSubline').textContent = 'Öffentliche Hauptnavigation verwalten.';
  if (innerWidth <= 1024) document.getElementById('sidebar').classList.remove('open');
}

function addSidebarEntry() {
  const system = [...document.querySelectorAll('#sidebar .nav-section')].find(section => section.querySelector('.nav-heading')?.textContent.trim() === 'System');
  if (!system || document.querySelector('[data-view="site-navigation"]')) return;
  const section = document.createElement('nav');
  section.className = 'nav-section';
  section.innerHTML = '<p class="nav-heading">Website</p><button class="nav-btn" type="button" data-view="site-navigation"><span class="nav-ico">N</span>Navigation</button>';
  section.querySelector('button').addEventListener('click', openView);
  system.before(section);
}

function setStatus(message, type = 'ok') {
  status.textContent = message;
  status.className = 'status ' + type;
}

function client() {
  const branch = document.getElementById('ghBranch').value.trim();
  const token = document.getElementById('ghToken').value.trim();
  if (!branch) throw new Error('Bitte GitHub-Branch angeben.');
  if (!token) throw new Error('GitHub Token fehlt.');
  return createGitHubClient({ owner: document.getElementById('ghOwner').value, repo: document.getElementById('ghRepo').value, branch, token });
}

function render() {
  if (!config) { list.innerHTML = '<p class="muted">Navigation noch nicht geladen.</p>'; return; }
  list.innerHTML = config.pages.map((page, index) => `<div class="site-navigation-row" data-site-page="${page.id}"><div><strong>${page.label}</strong><small>${page.href}</small></div><label><input type="checkbox" data-site-enabled ${page.enabled ? 'checked' : ''}> aktiv</label><label><input type="radio" name="site-home" data-site-home ${config.homePage === page.id ? 'checked' : ''}> Startseite</label><div class="site-navigation-actions"><button class="tool" type="button" data-site-up ${index === 0 ? 'disabled' : ''}>↑</button><button class="tool" type="button" data-site-down ${index === config.pages.length - 1 ? 'disabled' : ''}>↓</button></div></div>`).join('');
  list.querySelectorAll('[data-site-page]').forEach(row => {
    const id = row.dataset.sitePage;
    row.querySelector('[data-site-enabled]').addEventListener('change', event => {
      if (!event.target.checked && config.homePage === id) {
        setStatus('Die Startseite muss aktiv bleiben. Bitte zuerst eine andere Startseite wählen.', 'err');
        render();
        return;
      }
      config.pages.find(page => page.id === id).enabled = event.target.checked;
      setStatus('Ungespeicherte Änderungen.', 'warn');
      render();
    });
    row.querySelector('[data-site-home]').addEventListener('change', () => { const page = config.pages.find(item => item.id === id); if (!page.enabled) { setStatus('Eine inaktive Seite kann nicht Startseite sein.', 'err'); render(); return; } config.homePage = id; setStatus('Ungespeicherte Änderungen.', 'warn'); render(); });
    row.querySelector('[data-site-up]').addEventListener('click', () => { config = moveSitePage(config, id, -1); setStatus('Ungespeicherte Änderungen.', 'warn'); render(); });
    row.querySelector('[data-site-down]').addEventListener('click', () => { config = moveSitePage(config, id, 1); setStatus('Ungespeicherte Änderungen.', 'warn'); render(); });
  });
}

async function loadNavigation() {
  setStatus('Lade Navigation...', 'warn');
  try {
    const file = await client().getTextFile(PATH);
    config = normalizeSiteNavigation(JSON.parse(file.text));
    loadedSha = file.sha;
    render();
    setStatus('Navigation geladen.', 'ok');
  } catch (error) { setStatus(error.message || 'Navigation konnte nicht geladen werden.', 'err'); }
}

async function saveNavigation() {
  setStatus('Speichere Navigation...', 'warn');
  try {
    const github = client();
    const next = normalizeSiteNavigation(config);
    const fresh = await github.getTextFile(PATH);
    if (!loadedSha || fresh.sha !== loadedSha) throw new Error('Navigation wurde zwischenzeitlich geändert. Bitte neu laden.');
    const result = await github.putTextFile(PATH, JSON.stringify(next, null, 2) + '\n', fresh.sha, 'Update site navigation from admin v2');
    loadedSha = result.content?.sha || '';
    config = next;
    render();
    setStatus('Navigation gespeichert.', 'ok');
  } catch (error) { setStatus(error.message || 'Navigation konnte nicht gespeichert werden.', 'err'); }
}

root?.querySelector('[data-site-navigation-load]')?.addEventListener('click', loadNavigation);
root?.querySelector('[data-site-navigation-save]')?.addEventListener('click', saveNavigation);
document.addEventListener('site-navigation:load', loadNavigation);
document.addEventListener('site-navigation:save', saveNavigation);
document.getElementById('topLoadBtn')?.addEventListener('click', event => { if (!root.classList.contains('hidden')) { event.stopImmediatePropagation(); loadNavigation(); } }, true);
document.getElementById('topSaveBtn')?.addEventListener('click', event => { if (!root.classList.contains('hidden')) { event.stopImmediatePropagation(); saveNavigation(); } }, true);
addSidebarEntry();
render();
