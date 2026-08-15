import { buildResidentNewsPreview, isResidentNewsImportSessionCurrent, parseResidentNewsCsv, suggestResidentNewsMapping } from './residents-news-csv-model.js?v=resident-news-csv-1';
import { saveResidentNewsImport } from './residents-news-csv-save.js?v=resident-news-csv-1';
import { createGitHubClient } from '../../core/github-client.js';

let session = null;

function globalValue(name) {
  try { return window.eval(name); } catch (_) { return window[name]; }
}

function selectedResident() {
  const fn = globalValue('currentResident');
  return typeof fn === 'function' ? fn() : null;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function status(message, type = 'muted') {
  const node = document.querySelector('[data-resident-news-csv-status]');
  if (!node) return;
  node.className = `status ${type}`;
  node.textContent = message;
}

function resetImport(message = 'Import abgebrochen. Es wurden keine Daten geändert.') {
  session = null;
  const workflow = document.querySelector('[data-resident-news-csv-workflow]');
  const input = document.querySelector('[data-resident-news-csv-file]');
  if (workflow) workflow.hidden = true;
  if (input) input.value = '';
  status(message);
}

function delimiterName(value) {
  return value === '\t' ? 'Tab' : value === ';' ? 'Semikolon' : 'Komma';
}

function renderMapping() {
  const options = session.parsed.headers.map((header, index) => `<option value="${index}">${escapeHtml(header || `Spalte ${index + 1}`)}</option>`).join('');
  const date = document.querySelector('[data-resident-news-csv-date]');
  const text = document.querySelector('[data-resident-news-csv-text]');
  date.innerHTML = `<option value="-1">Bitte wählen</option>${options}`;
  text.innerHTML = `<option value="-1">Bitte wählen</option>${options}`;
  date.value = String(session.mapping.date);
  text.value = String(session.mapping.text);
}

function previewCounts(rows) {
  return rows.reduce((out, row) => {
    out[row.status] = (out[row.status] || 0) + 1;
    if (row.included) out.imported++;
    else out.excluded++;
    return out;
  }, { imported: 0, excluded: 0 });
}

function updatePreviewSummary() {
  const resident = selectedResident();
  const counts = previewCounts(session?.preview || []);
  document.querySelector('[data-resident-news-csv-summary]').textContent = `${session.fileName} · ${delimiterName(session.parsed.delimiter)} · ${counts.imported} importierbar · ${counts.excluded} ausgeschlossen`;
  const confirm = document.querySelector('[data-resident-news-csv-confirm]');
  confirm.textContent = `${counts.imported} News in ${resident?.name || session.residentName} importieren`;
  confirm.disabled = counts.imported === 0;
}

function renderPreview() {
  const resident = selectedResident();
  if (!resident || !isResidentNewsImportSessionCurrent(session, resident.id)) return resetImport('Resident wurde gewechselt. Bitte CSV erneut auswählen.');
  try {
    session.mapping = {
      date: Number(document.querySelector('[data-resident-news-csv-date]').value),
      text: Number(document.querySelector('[data-resident-news-csv-text]').value)
    };
    session.preview = buildResidentNewsPreview(session.parsed, session.mapping, resident.newsItems || []);
    const labels = { valid: 'gültig', invalid: 'ungültig', 'csv-duplicate': 'CSV-Duplikat', 'existing-duplicate': 'bereits vorhanden' };
    document.querySelector('[data-resident-news-csv-preview]').innerHTML = session.preview.length
      ? `<div class="resident-news-csv-table"><table><thead><tr><th>Import</th><th>Zeile</th><th>Datum</th><th>Text</th><th>Status</th></tr></thead><tbody>${session.preview.map((row, index) => `<tr class="${row.status === 'valid' ? '' : row.status === 'invalid' ? 'csv-invalid' : 'csv-duplicate'}"><td><input type="checkbox" data-resident-news-csv-row="${index}" ${row.included ? 'checked' : ''} ${row.status !== 'valid' ? 'disabled' : ''}></td><td>${row.line}</td><td>${escapeHtml(row.date || row.rawDate)}</td><td>${escapeHtml(row.text)}</td><td>${labels[row.status]}${row.message ? `: ${escapeHtml(row.message)}` : ''}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Keine Datenzeilen vorhanden.</p>';
    const counts = previewCounts(session.preview);
    updatePreviewSummary();
    status(counts.imported ? 'Vorschau bereit. Noch keine GitHub-Änderung.' : 'Keine importierbaren News vorhanden.', counts.imported ? 'ok' : 'err');
  } catch (error) {
    session.preview = [];
    document.querySelector('[data-resident-news-csv-preview]').innerHTML = '';
    document.querySelector('[data-resident-news-csv-confirm]').disabled = true;
    status(error.message, 'err');
  }
}

async function readFile(file) {
  const resident = selectedResident();
  if (!resident?.id) return status('Bitte zuerst einen Resident auswählen.', 'err');
  try {
    const parsed = parseResidentNewsCsv(await file.text());
    session = { residentId: resident.id, residentName: resident.name || resident.id, fileName: file.name, parsed, mapping: suggestResidentNewsMapping(parsed.headers), preview: [] };
    document.querySelector('[data-resident-news-csv-workflow]').hidden = false;
    document.querySelector('[data-resident-news-csv-file-name]').textContent = `Datei: ${file.name}`;
    renderMapping();
    renderPreview();
  } catch (error) { resetImport(error.message); status(error.message, 'err'); }
}

function configValue(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

async function confirmImport() {
  const resident = selectedResident();
  if (!resident || !isResidentNewsImportSessionCurrent(session, resident.id)) return resetImport('Resident wurde gewechselt. Bitte CSV erneut auswählen.');
  const state = globalValue('state');
  if (state?.dirty) return status('Bitte andere Entwurfsänderungen zuerst speichern oder neu laden.', 'err');
  const branch = configValue('ghBranch');
  if (!branch) return status('Bitte GitHub-Branch angeben, bevor News importiert werden.', 'err');
  if (branch === 'main') return status('Resident-Save auf main ist für Tests gesperrt. Bitte Testbranch verwenden.', 'err');
  const token = configValue('ghToken');
  if (!token) return status('GitHub Token fehlt.', 'err');
  const expectedId = session.residentId;
  try {
    status(`Lade residents.json frisch von GitHub-Branch ${branch} ...`, 'warn');
    const client = createGitHubClient({ owner: configValue('ghOwner'), repo: configValue('ghRepo'), branch, token });
    const result = await saveResidentNewsImport({ client, path: configValue('residentsPath'), residentId: expectedId, previewRows: session.preview, confirmed: true });
    if (selectedResident()?.id !== expectedId) throw new Error('Resident wurde während des Speicherns gewechselt. Bitte neu laden.');
    state.residentsData = result.document;
    state.residentsSha = result.sha;
    state.loadedResidentCount = result.document.residents.length;
    state.dirty = false;
    globalValue('ensureResidents')?.();
    const targetIndex = result.document.residents.findIndex(item => item.id === expectedId);
    state.selectedResident = targetIndex;
    globalValue('renderAll')?.();
    globalValue('setResidentTab')?.('news');
    session = null;
    document.querySelector('[data-resident-news-csv-workflow]').hidden = true;
    status(`${result.imported} News erfolgreich auf GitHub-Branch ${branch} importiert.`, 'ok');
  } catch (error) { status(error.message, 'err'); }
}

export function installResidentNewsCsvImport() {
  const panel = document.getElementById('resident-tab-news');
  if (!panel || panel.querySelector('[data-resident-news-csv]')) return;
  const area = document.createElement('section');
  area.className = 'resident-news-csv';
  area.dataset.residentNewsCsv = '';
  area.innerHTML = '<div class="head"><div><b>News aus CSV importieren</b><div class="muted">Merge/Add mit Vorschau. Kein Save ohne Bestätigung.</div></div><button class="tool" type="button" data-resident-news-csv-open>CSV importieren</button></div><input data-resident-news-csv-file type="file" accept=".csv,text/csv" hidden><div data-resident-news-csv-workflow hidden><p data-resident-news-csv-file-name></p><div class="resident-news-csv-grid"><div class="field"><label class="label">Datumsspalte</label><select class="select" data-resident-news-csv-date></select></div><div class="field"><label class="label">Textspalte</label><select class="select" data-resident-news-csv-text></select></div></div><p class="resident-news-csv-summary" data-resident-news-csv-summary></p><div data-resident-news-csv-preview></div><div class="resident-news-csv-actions"><button class="btn" type="button" data-resident-news-csv-cancel>Abbrechen</button><button class="btn primary" type="button" data-resident-news-csv-confirm disabled>News importieren</button></div></div><p class="status muted" data-resident-news-csv-status aria-live="polite">Noch keine CSV ausgewählt.</p>';
  panel.querySelector('.head')?.after(area);
  area.querySelector('[data-resident-news-csv-open]').onclick = () => area.querySelector('[data-resident-news-csv-file]').click();
  area.querySelector('[data-resident-news-csv-file]').onchange = event => event.target.files?.[0] && readFile(event.target.files[0]);
  area.querySelector('[data-resident-news-csv-date]').onchange = renderPreview;
  area.querySelector('[data-resident-news-csv-text]').onchange = renderPreview;
  area.querySelector('[data-resident-news-csv-cancel]').onclick = () => resetImport();
  area.querySelector('[data-resident-news-csv-confirm]').onclick = confirmImport;
  area.querySelector('[data-resident-news-csv-preview]').onchange = event => {
    const index = Number(event.target.dataset.residentNewsCsvRow);
    if (session?.preview[index]) session.preview[index].included = event.target.checked;
    updatePreviewSummary();
  };
}

document.addEventListener('click', event => {
  if (session && event.target.closest?.('[data-resident-index]')) queueMicrotask(() => {
    if (selectedResident()?.id !== session?.residentId) resetImport('Resident wurde gewechselt. Bitte CSV erneut auswählen.');
  });
}, true);
