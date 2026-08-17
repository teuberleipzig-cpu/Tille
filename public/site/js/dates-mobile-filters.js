const MOBILE_QUERY = '(max-width: 820px)';

export function initialiseDatesMobileFilters({ documentRef = document, matchMediaRef = matchMedia } = {}) {
  const controls = documentRef.getElementById('dates-controls');
  const toggle = documentRef.getElementById('dates-filter-toggle');
  const panel = documentRef.getElementById('dates-filter-panel');
  if (!controls || !toggle || !panel || controls.dataset.mobileFiltersReady === 'true') return false;

  const media = matchMediaRef(MOBILE_QUERY);
  let mobileExpanded = false;

  const applyState = () => {
    const mobile = media.matches;
    toggle.hidden = !mobile;
    toggle.setAttribute('aria-expanded', String(mobile && mobileExpanded));
    panel.hidden = mobile && !mobileExpanded;
  };

  const closeMobilePanel = () => {
    if (panel.contains(documentRef.activeElement)) toggle.focus();
    mobileExpanded = false;
    applyState();
  };

  toggle.addEventListener('click', () => {
    if (!media.matches) return;
    if (mobileExpanded) closeMobilePanel();
    else {
      mobileExpanded = true;
      applyState();
    }
  });
  media.addEventListener('change', () => {
    if (media.matches) closeMobilePanel();
    else applyState();
  });

  controls.dataset.mobileFiltersReady = 'true';
  applyState();
  return true;
}

if (typeof document !== 'undefined') initialiseDatesMobileFilters();
