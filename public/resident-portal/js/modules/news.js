import { $, escapeHtml, setStatus } from '../core/dom.js';
import { markDirty, requireResident } from '../core/state.js';

function items() {
  const resident = requireResident();
  if (!Array.isArray(resident.newsItems)) {
    resident.newsItems = Array.isArray(resident.news) ? resident.news : [];
  }
  resident.newsItems = resident.newsItems.map(item => typeof item === 'string' ? { date: '', text: item } : {
    date: item.date || '',
    text: item.text || ''
  });
  return resident.newsItems;
}

export function sortByDate() {
  const list = items();
  list.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return list;
}

function card(item, index) {
  return `
    <div class="section-card resident-news-card" data-news-index="${index}">
      <div class="section-body">
        <div class="form-grid">
          <div class="field"><label class="label">Datum</label><input class="input" type="date" data-news-date value="${escapeHtml(item.date)}"></div>
          <div class="field portal-news-actions"><label class="label">Aktionen</label><div class="tools"><button class="tool" type="button" data-news-up>↑</button><button class="tool" type="button" data-news-down>↓</button><button class="tool danger" type="button" data-news-delete>Löschen</button></div></div>
          <div class="field full"><label class="label">Text</label><textarea class="textarea" data-news-text>${escapeHtml(item.text)}</textarea></div>
        </div>
      </div>
    </div>`;
}

export function render() {
  const box = $('newsList');
  if (!box) return;
  const list = items();
  box.innerHTML = list.length ? list.map(card).join('') : '<p class="muted">Noch keine News.</p>';
}

function syncFromCard(cardEl) {
  const index = Number(cardEl.dataset.newsIndex);
  const list = items();
  if (!list[index]) return;
  list[index].date = cardEl.querySelector('[data-news-date]')?.value || '';
  list[index].text = cardEl.querySelector('[data-news-text]')?.value || '';
}

function move(index, delta) {
  const list = items();
  const to = index + delta;
  if (to < 0 || to >= list.length) return;
  const item = list.splice(index, 1)[0];
  list.splice(to, 0, item);
  markDirty();
  render();
}

export function read() {
  document.querySelectorAll('[data-news-index]').forEach(syncFromCard);
  return items();
}

export function readSorted() {
  read();
  return sortByDate();
}

export function init() {
  const panel = $('panel-news');
  if (!panel || panel.dataset.newsBound === '1') return;
  panel.dataset.newsBound = '1';

  $('addNewsBtn')?.addEventListener('click', () => {
    read();
    items().unshift({ date: new Date().toISOString().slice(0, 10), text: '' });
    markDirty();
    render();
  });

  $('sortPortalNewsBtn')?.addEventListener('click', () => {
    readSorted();
    markDirty();
    render();
    setStatus('News nach Datum sortiert. Noch nicht gespeichert.', 'ok');
  });

  panel.addEventListener('input', event => {
    const cardEl = event.target.closest('[data-news-index]');
    if (!cardEl) return;
    syncFromCard(cardEl);
    markDirty();
  });

  panel.addEventListener('click', event => {
    const cardEl = event.target.closest('[data-news-index]');
    if (!cardEl) return;
    const index = Number(cardEl.dataset.newsIndex);
    if (event.target.matches('[data-news-up]')) move(index, -1);
    if (event.target.matches('[data-news-down]')) move(index, 1);
    if (event.target.matches('[data-news-delete]')) {
      items().splice(index, 1);
      markDirty();
      render();
    }
  });
}
