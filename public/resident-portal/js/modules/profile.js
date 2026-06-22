import { $, escapeHtml } from '../core/dom.js';
import { markDirty, requireResident } from '../core/state.js';

const ids = ['resName', 'resCity', 'resGenre', 'resLabels', 'resRelated', 'resBio'];

function splitList(value) {
  return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
}

function joinList(value) {
  return Array.isArray(value) ? value.join(', ') : String(value || '');
}

function getTextField(resident) {
  return resident.bio ?? resident.description ?? resident.text ?? resident.about ?? '';
}

function setTextField(resident, value) {
  if (Object.hasOwn(resident, 'bio')) resident.bio = value;
  else if (Object.hasOwn(resident, 'description')) resident.description = value;
  else if (Object.hasOwn(resident, 'text')) resident.text = value;
  else if (Object.hasOwn(resident, 'about')) resident.about = value;
  else resident.bio = value;
}

export function render() {
  const resident = requireResident();
  $('editorTitle').textContent = resident.name || resident.id || 'Resident';
  $('editorMeta').textContent = [resident.city, resident.genre].filter(Boolean).join(' · ') || 'Resident bearbeiten.';
  $('resName').value = resident.name || '';
  $('resCity').value = resident.city || '';
  $('resGenre').value = resident.genre || '';
  $('resLabels').value = joinList(resident.labels);
  $('resRelated').value = joinList(resident.relatedProjects);
  $('resBio').value = getTextField(resident);
}

export function read() {
  const resident = requireResident();
  resident.name = $('resName').value.trim();
  resident.city = $('resCity').value.trim();
  resident.genre = $('resGenre').value.trim();
  resident.labels = splitList($('resLabels').value);
  resident.relatedProjects = splitList($('resRelated').value);
  setTextField(resident, $('resBio').value.trim());
  return resident;
}

export function init() {
  ids.forEach(id => {
    const el = $(id);
    if (!el || el.dataset.profileBound === '1') return;
    el.dataset.profileBound = '1';
    el.addEventListener('input', () => {
      read();
      markDirty();
      $('editorTitle').textContent = escapeHtml($('resName').value || 'Resident');
      $('editorMeta').textContent = [$('resCity').value, $('resGenre').value].filter(Boolean).join(' · ');
    });
  });
}
