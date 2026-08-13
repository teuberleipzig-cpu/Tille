import { normalizeSiteNavigation } from '../public/site/js/site-navigation-model.js';
import { initialiseMobileNavigation } from '../public/site/js/mobile-navigation.js';

const CONFIG_URL = 'public/site/data/site-navigation.json';
const CURRENT_PAGE_IDS = { 'index.html': 'dates', 'news.html': 'news', 'residents.html': 'residents', 'resident-releases.html': 'residents', 'about.html': 'about', 'contact.html': 'contact', 'history.html': 'history', 'feedback.html': 'feedback', 'feedback-thanks.html': 'feedback', 'event.html': 'dates', 'gallery.html': 'gallery' };

function currentPageId() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return CURRENT_PAGE_IDS[file] || '';
}

function renderNavigation(nav, config) {
  const activeId = currentPageId();
  const fragment = document.createDocumentFragment();
  config.pages.filter(page => page.enabled).forEach(page => {
    const link = document.createElement('a');
    link.href = page.href;
    link.textContent = page.label;
    if (page.id === activeId) link.classList.add('active');
    fragment.append(link);
  });
  nav.replaceChildren(fragment);
}

function redirectHome(config) {
  const file = location.pathname.split('/').pop() || 'index.html';
  if (file !== 'index.html' || location.search || location.hash || config.homePage === 'dates') return;
  const target = config.pages.find(page => page.id === config.homePage && page.enabled);
  if (target && target.href !== 'index.html') location.replace(target.href);
}

async function initialise() {
  const nav = document.querySelector('nav.nav');
  if (!nav) return;
  try {
    const response = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Navigation config unavailable');
    const config = normalizeSiteNavigation(await response.json());
    redirectHome(config);
    renderNavigation(nav, config);
    initialiseMobileNavigation(config, currentPageId(), nav);
  } catch (_) {
    // The static navigation remains the fail-safe fallback.
  }
}

initialise();
