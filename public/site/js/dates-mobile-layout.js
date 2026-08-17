const MOBILE_QUERY = '(max-width: 820px)';
const READY_CLASS = 'dates-mobile-layout-ready';
const DETAIL_CLASS = 'dates-event-detail-mode';

export function initialiseDatesMobileLayout({ documentRef = document, matchMediaRef = matchMedia, locationRef = location } = {}) {
  const controls = documentRef.getElementById('dates-controls');
  const events = documentRef.getElementById('events');
  const sidebar = documentRef.querySelector('.sidebar');
  const slideshow = documentRef.getElementById('resident-slideshow');
  if (!controls || !events || !sidebar || !slideshow || controls.dataset.mobileLayoutReady === 'true') return false;

  const media = matchMediaRef(MOBILE_QUERY);
  const isDetail = new URLSearchParams(locationRef.search).has('event');
  const syncPlacement = () => {
    if (media.matches && !isDetail) events.before(controls);
    else sidebar.insertBefore(controls, slideshow);
  };

  controls.dataset.mobileLayoutReady = 'true';
  media.addEventListener('change', syncPlacement);
  syncPlacement();
  documentRef.documentElement.classList.add(READY_CLASS);
  documentRef.documentElement.classList.toggle(DETAIL_CLASS, isDetail);
  return true;
}

if (typeof document !== 'undefined') initialiseDatesMobileLayout();
