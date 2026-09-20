import { githubFixture, fixtureData } from './portal-github-fixture.mjs';
const mock = githubFixture();
const originalFetch = window.fetch.bind(window);
const tools = document.createElement('section');
tools.id = 'fixtureTools';
tools.setAttribute('aria-label', 'Mock QA controls');
tools.innerHTML = '<p>LOCAL MOCK ONLY – no GitHub network</p><button id="fixtureMove">Mock: foreign write</button> <button id="fixture403">Mock: Actions 403</button> <button id="fixturePresskit">Mock: drop PDF</button> <button id="fixturePhoto">Mock: drop photo</button> <button id="fixtureCover">Mock: drop cover</button><pre id="fixtureMetrics"></pre>';
document.body.prepend(tools);
function metrics() {
  document.getElementById('fixtureMetrics').textContent = JSON.stringify({
    mockRequests: mock.calls.length, refUpdates: mock.calls.filter(c => c.method === 'PATCH').length,
    dispatches: mock.calls.filter(c => c.url.endsWith('/dispatches')).length, saved: mock.data().residents[0]
  }, null, 2);
}
window.fetch = async (url, options) => {
  const address = new URL(url, location.href);
  if (address.origin === 'https://api.github.com') { const response = await mock.fetcher(address.href, options); metrics(); return response; }
  if (address.pathname === '/public/residents/data/residents.json') return new Response(JSON.stringify(fixtureData()), { headers: { 'Content-Type': 'application/json' } });
  if (address.origin !== location.origin) throw new Error('Mock blocks external network');
  return originalFetch(url, options);
};
document.getElementById('fixtureMove').onclick = () => { mock.move(); metrics(); };
document.getElementById('fixture403').onclick = () => { mock.controls.dispatch403 = true; };
function drop(selector, file) {
  const target = document.querySelector(selector);
  const dataTransfer = new DataTransfer(); dataTransfer.items.add(file);
  target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer }));
}
document.getElementById('fixturePresskit').onclick = () => drop('[data-presskit-drop]', new File(['%PDF-1.4\nFixture'], 'fixture.pdf', { type: 'application/pdf' }));
async function imageFile() {
  const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
  canvas.getContext('2d').fillRect(0, 0, 16, 16);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  return new File([blob], 'fixture.png', { type: 'image/png' });
}
document.getElementById('fixturePhoto').onclick = async () => drop('[data-photo-drop]', await imageFile());
document.getElementById('fixtureCover').onclick = async () => drop('#releaseCoverDrop', await imageFile());
metrics();
await import('/public/resident-portal/js/app-coverfix.js?v=staging-writer-1');
