// Test-server injected before any production script. Never loaded by production HTML.
(function () {
  const localFetch = window.fetch.bind(window);
  window.fetch = (url, options = {}) => {
    const target = new URL(url, location.href);
    if (target.origin === 'https://api.github.com') {
      const prefix = '/repos/teuberleipzig-cpu/Tille';
      if (!target.pathname.startsWith(prefix + '/')) throw new Error('Foreign mock repository');
      return localFetch('/__mock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        path: target.pathname.slice(prefix.length) + target.search, method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : undefined
      }) }); // Authorization is intentionally discarded.
    }
    if (target.origin !== location.origin) throw new Error('Mock blocks external network');
    return localFetch(url, options);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const tools = document.createElement('section'); tools.setAttribute('aria-label', 'Admin mock QA');
    for (const [label, control] of [['Mock: Actions 403', '403'], ['Mock: conflict', 'conflict']]) {
      const button = document.createElement('button'); button.textContent = label;
      button.onclick = () => localFetch('/__mock', { method: 'POST', body: JSON.stringify({ control }) }); tools.append(button);
    }
    document.body.prepend(tools);
  });
})();
