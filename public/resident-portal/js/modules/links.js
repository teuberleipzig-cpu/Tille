import { $ } from '../core/dom.js';
import { markDirty, requireResident } from '../core/state.js';

const fields = [
  ['resInstagram', ['instagramUrl', 'instagram', 'instagramLink']],
  ['resSoundcloud', ['soundcloudUrl', 'soundcloud', 'soundcloudLink']],
  ['resRA', ['raUrl', 'residentAdvisorUrl', 'ra', 'residentAdvisor']],
  ['resDiscogs', ['discogsUrl', 'discogs']],
  ['resBandcamp', ['bandcampUrl', 'bandcamp']],
  ['resBooking', ['bookingEmail', 'booking', 'email']]
];

function getValue(resident, keys) {
  for (const key of keys) {
    if (resident[key]) return resident[key];
  }
  return '';
}

function setValue(resident, keys, value) {
  const existing = keys.find(key => Object.hasOwn(resident, key));
  resident[existing || keys[0]] = value;
}

export function render() {
  const resident = requireResident();
  fields.forEach(([id, keys]) => {
    const el = $(id);
    if (el) el.value = getValue(resident, keys);
  });
}

export function read() {
  const resident = requireResident();
  fields.forEach(([id, keys]) => {
    const el = $(id);
    if (el) setValue(resident, keys, el.value.trim());
  });
  return resident;
}

export function init() {
  fields.forEach(([id]) => {
    const el = $(id);
    if (!el || el.dataset.linksBound === '1') return;
    el.dataset.linksBound = '1';
    el.addEventListener('input', () => {
      read();
      markDirty();
    });
  });
}
