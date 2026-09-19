import { contractText } from './text.mjs';

export function tagKey(value) {
  return contractText(value, 'Tag', 60, true).toLowerCase().normalize('NFC');
}

export function normalizeTags(value) {
  if (!Array.isArray(value) || value.length > 20) throw new Error('tags: maximal 20 Einträge.');
  const tags = new Map();
  for (const item of value) {
    const display = contractText(item, 'Tag', 60, true);
    const key = tagKey(display);
    if (!tags.has(key)) tags.set(key, display);
  }
  return [...tags.values()];
}
