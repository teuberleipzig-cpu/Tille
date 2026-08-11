import { CONFIG, PORTAL_VERSION, inviteParam, residentParam } from './core/config.js?v=branch-param-1';
import { bindTabs, setStatus, showScreen } from './core/dom.js';
import { loadResidentForLogin, initAuth } from './modules/auth.js?v=branch-param-1';
import * as profile from './modules/profile.js';
import * as links from './modules/links.js';
import * as news from './modules/news.js?v=news-top-save-2';
import * as media from './modules/media.js?v=media-preview-map-1';
import * as releases from './modules/releases.js?v=cover-preview-1';
import { initSave } from './modules/save.js?v=resident-branch-1';

const BUILD_LABEL = `${PORTAL_VERSION} news-media-fix-3`;

function showBuildBadge() {
  let badge = document.getElementById('portalBuildBadge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'portalBuildBadge';
    badge.setAttribute('aria-label', 'Portal Build Version');
    badge.style.position = 'fixed';
    badge.style.left = '8px';
    badge.style.bottom = '8px';
    badge.style.zIndex = '99999';
    badge.style.padding = '4px 6px';
    badge.style.border = '1px solid #111';
    badge.style.background = '#fff';
    badge.style.color = '#111';
    badge.style.font = '11px/1.2 monospace';
    badge.style.pointerEvents = 'none';
    document.body.appendChild(badge);
  }
  badge.textContent = BUILD_LABEL + ' geladen';
}

function renderAll() {
  profile.render();
  links.render();
  news.render();
  media.render();
  releases.render();
  showBuildBadge();
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
  console.info('[ResidentPortal]', BUILD_LABEL);
  showBuildBadge();
  const branchStatus = document.getElementById('portalBranchStatus');
  if (branchStatus) branchStatus.textContent = `GitHub-Branch: ${CONFIG.branch || '(nicht angegeben)'}`;
  initModules();
  try {
    await loadResidentForLogin();
    showScreen('loginScreen');
    setStatus(`${BUILD_LABEL} geladen. Bitte Code und GitHub-Token eingeben.`, 'ok');
  } catch (error) {
    showScreen('loginScreen');
    const loginButton = document.getElementById('loginBtn');
    if (loginButton) loginButton.disabled = true;
    setStatus(error.message || 'Portal konnte nicht geladen werden.', 'danger');
  }
}

window.ResidentPortalBranchDiag = () => ({
  branch: CONFIG.branch,
  residentParam,
  inviteParam,
  hostname: window.location.hostname
});

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
