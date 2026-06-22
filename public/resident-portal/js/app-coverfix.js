import { PORTAL_VERSION } from './core/config.js';
import { bindTabs, setStatus, showScreen } from './core/dom.js';
import { loadResidentForLogin, initAuth } from './modules/auth.js';
import * as profile from './modules/profile.js';
import * as links from './modules/links.js';
import * as news from './modules/news.js';
import * as media from './modules/media.js';
import * as releases from './modules/releases.js?v=cover-preview-1';
import { initSave } from './modules/save.js';

function renderAll() {
  profile.render();
  links.render();
  news.render();
  media.render();
  releases.render();
}

function initModules() {
  bindTabs();
  profile.init();
  links.init();
  news.init();
  media.init();
  releases.init();
  initSave();
  initAuth(renderAll);
}

async function boot() {
  console.info('[ResidentPortal]', PORTAL_VERSION, 'cover-preview-1');
  initModules();
  try {
    await loadResidentForLogin();
    showScreen('loginScreen');
    setStatus(`${PORTAL_VERSION} cover-preview-1 geladen. Bitte Code und GitHub-Token eingeben.`, 'ok');
  } catch (error) {
    showScreen('loginScreen');
    const loginButton = document.getElementById('loginBtn');
    if (loginButton) loginButton.disabled = true;
    setStatus(error.message || 'Portal konnte nicht geladen werden.', 'danger');
  }
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
