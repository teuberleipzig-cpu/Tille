(function () {
  'use strict';

  var TRACKING_VERSION = 'tracking-1';
  var TRACKING_ENABLED = false;
  var ENDPOINT = '/api/track.php';
  var MAX_LABEL_LENGTH = 120;

  function isEnabled() {
    return TRACKING_ENABLED === true;
  }

  function trimText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
  }

  function getPagePath() {
    return window.location.pathname + window.location.search + window.location.hash;
  }

  function getArea(element) {
    if (!element) return '';
    if (element.closest('nav')) return 'navigation';
    if (element.closest('footer')) return 'footer';
    if (element.closest('form')) return 'form';
    if (element.closest('main')) return 'main';
    return '';
  }

  function getInteractiveElement(target) {
    if (!target || !target.closest) return null;
    return target.closest('a, button, input, select, textarea, summary, [role="button"], [data-track]');
  }

  function getElementLabel(element) {
    if (!element) return '';

    return trimText(
      element.getAttribute('data-track-label') ||
      element.getAttribute('aria-label') ||
      element.getAttribute('title') ||
      element.innerText ||
      element.textContent ||
      element.value ||
      element.name ||
      element.id ||
      element.tagName
    );
  }

  function buildEvent(eventType, details) {
    return Object.assign({
      eventType: eventType,
      page: getPagePath(),
      ts: new Date().toISOString(),
      version: TRACKING_VERSION
    }, details || {});
  }

  function sendEvent(eventType, details) {
    if (!isEnabled()) return false;

    var payload = buildEvent(eventType, details);
    var body = JSON.stringify(payload);

    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([body], { type: 'application/json' });
        if (navigator.sendBeacon(ENDPOINT, blob)) return true;
      }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        credentials: 'same-origin'
      }).catch(function () {});

      return true;
    } catch (error) {
      return false;
    }
  }

  function trackPageView(source) {
    sendEvent('page_view', {
      source: source || 'load',
      title: trimText(document.title)
    });
  }

  function trackClick(event) {
    var element = getInteractiveElement(event.target);
    if (!element) return;

    sendEvent('click', {
      label: getElementLabel(element),
      element: element.tagName ? element.tagName.toLowerCase() : '',
      area: getArea(element),
      href: element.href || element.getAttribute('href') || '',
      type: element.getAttribute('type') || '',
      target: element.getAttribute('target') || ''
    });
  }

  function trackFormSubmit(event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches('form')) return;

    sendEvent('form_submit', {
      label: trimText(form.getAttribute('data-track-label') || form.getAttribute('aria-label') || form.className || form.id || 'form'),
      area: getArea(form)
    });
  }

  function patchHistoryMethod(methodName) {
    var original = history[methodName];
    if (typeof original !== 'function') return;

    history[methodName] = function () {
      var result = original.apply(this, arguments);
      window.dispatchEvent(new Event('distillery:locationchange'));
      return result;
    };
  }

  function initTracking() {
    if (!isEnabled()) return;

    document.addEventListener('click', trackClick, true);
    document.addEventListener('submit', trackFormSubmit, true);
    window.addEventListener('popstate', function () { trackPageView('popstate'); });
    window.addEventListener('hashchange', function () { trackPageView('hashchange'); });
    window.addEventListener('distillery:locationchange', function () { trackPageView('history'); });

    patchHistoryMethod('pushState');
    patchHistoryMethod('replaceState');
    trackPageView('load');
  }

  window.distilleryTracking = {
    version: TRACKING_VERSION,
    enabled: isEnabled,
    track: sendEvent
  };

  initTracking();
}());
