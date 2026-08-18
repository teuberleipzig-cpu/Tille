const ROOT_READY_CLASS = 'mobile-navigation-ready';
const BODY_OPEN_CLASS = 'site-mobile-navigation-open';
const MOBILE_QUERY = '(max-width: 820px)';
const SCROLL_THRESHOLD = 10;
export const ART_STATE_COUNT = 8;

export function chooseArtState(previousState, randomValue = Math.random()) {
  const previous = Number.isInteger(previousState) && previousState >= 0 && previousState < ART_STATE_COUNT ? previousState : null;
  const optionCount = previous === null ? ART_STATE_COUNT : ART_STATE_COUNT - 1;
  const normalizedRandom = Math.min(Math.max(Number(randomValue) || 0, 0), 1 - Number.EPSILON);
  const pick = Math.floor(normalizedRandom * optionCount);
  return previous !== null && pick >= previous ? pick + 1 : pick;
}

export function enabledMobilePages(config) {
  return config.pages.filter(page => page.enabled);
}

export function initialiseMobileNavigation(config, activePageId, nav) {
  if (!nav) return false;
  const pages = enabledMobilePages(config);
  if (!pages.length) return false;

  let root = document.querySelector('[data-site-mobile-navigation]');
  if (root) {
    root.mobileNavigationDestroy?.();
    root.remove();
  }

  root = document.createElement('div');
  root.className = 'site-mobile-navigation';
  root.dataset.siteMobileNavigation = '';

  const logo = document.querySelector('header.logo');
  if (!logo) return false;
  const logoAnchor = document.createElement('span');
  logoAnchor.className = 'site-mobile-logo-anchor';
  logoAnchor.setAttribute('aria-hidden', 'true');
  logo.before(logoAnchor);

  const header = document.createElement('div');
  header.className = 'site-mobile-header';

  const toggle = document.createElement('button');
  toggle.className = 'site-mobile-toggle';
  toggle.type = 'button';
  toggle.setAttribute('aria-label', 'Menü öffnen');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'site-mobile-drawer');
  for (let line = 0; line < 3; line += 1) toggle.append(document.createElement('span'));

  const overlay = document.createElement('button');
  overlay.className = 'site-mobile-overlay';
  overlay.type = 'button';
  overlay.setAttribute('aria-label', 'Menü schließen');
  overlay.tabIndex = -1;

  const drawer = document.createElement('aside');
  drawer.className = 'site-mobile-drawer';
  drawer.id = 'site-mobile-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'false');
  drawer.setAttribute('aria-label', 'Mobile Hauptnavigation');
  drawer.setAttribute('aria-hidden', 'true');

  const close = document.createElement('button');
  close.className = 'site-mobile-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Menü schließen');
  close.textContent = '×';

  const links = document.createElement('nav');
  links.className = 'site-mobile-links';
  links.setAttribute('aria-label', 'Mobile Hauptnavigation');
  pages.forEach(page => {
    const link = document.createElement('a');
    link.href = page.href;
    link.textContent = page.label;
    if (page.id === activePageId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    links.append(link);
  });

  let previousArtState = null;
  const setOpen = (open, returnFocus = false) => {
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    if (open && !wasOpen) {
      previousArtState = chooseArtState(previousArtState);
      toggle.dataset.artState = String(previousArtState);
    }
    root.classList.toggle('is-open', open);
    document.body.classList.toggle(BODY_OPEN_CLASS, open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.setAttribute('aria-modal', String(open));
    if (open) close.focus();
    else if (returnFocus) toggle.focus();
  };

  const focusableElements = () => [...drawer.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')];

  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  const scrollListenerOptions = { passive: true, signal: controller.signal };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true', true), listenerOptions);
  close.addEventListener('click', () => setOpen(false, true), listenerOptions);
  overlay.addEventListener('click', () => setOpen(false, true), listenerOptions);
  document.addEventListener('keydown', event => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      setOpen(false, true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = focusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, listenerOptions);
  const media = matchMedia(MOBILE_QUERY);
  const mountLogo = () => {
    if (logo.parentElement !== header) header.prepend(logo);
  };
  const restoreLogo = () => {
    if (logo.parentElement === header) logoAnchor.after(logo);
  };
  const updateScrollState = () => {
    header.classList.toggle('site-mobile-header-scrolled', window.scrollY > SCROLL_THRESHOLD);
  };
  const updateMobileState = matches => {
    if (matches) {
      mountLogo();
      updateScrollState();
    } else {
      setOpen(false);
      restoreLogo();
      header.classList.remove('site-mobile-header-scrolled');
    }
  };
  media.addEventListener('change', event => {
    updateMobileState(event.matches);
  }, listenerOptions);
  window.addEventListener('scroll', updateScrollState, scrollListenerOptions);
  window.addEventListener('pageshow', updateScrollState, listenerOptions);

  drawer.append(close, links);
  header.append(toggle);
  root.append(header, overlay, drawer);
  root.mobileNavigationDestroy = () => {
    setOpen(false);
    controller.abort();
    restoreLogo();
    logoAnchor.remove();
  };
  document.body.append(root);
  updateMobileState(media.matches);
  document.documentElement.classList.add(ROOT_READY_CLASS);
  return true;
}
