const ROOT_READY_CLASS = 'mobile-navigation-ready';
const BODY_OPEN_CLASS = 'site-mobile-navigation-open';
const MOBILE_QUERY = '(max-width: 820px)';

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

  const setOpen = (open, returnFocus = false) => {
    root.classList.toggle('is-open', open);
    document.body.classList.toggle(BODY_OPEN_CLASS, open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    drawer.setAttribute('aria-hidden', String(!open));
    if (open) close.focus();
    else if (returnFocus) toggle.focus();
  };

  const controller = new AbortController();
  const listenerOptions = { signal: controller.signal };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true', true), listenerOptions);
  close.addEventListener('click', () => setOpen(false, true), listenerOptions);
  overlay.addEventListener('click', () => setOpen(false, true), listenerOptions);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
  }, listenerOptions);
  const media = matchMedia(MOBILE_QUERY);
  media.addEventListener('change', event => {
    if (!event.matches) setOpen(false);
  }, listenerOptions);

  drawer.append(close, links);
  root.append(toggle, overlay, drawer);
  root.mobileNavigationDestroy = () => {
    setOpen(false);
    controller.abort();
  };
  document.body.append(root);
  document.documentElement.classList.add(ROOT_READY_CLASS);
  return true;
}
