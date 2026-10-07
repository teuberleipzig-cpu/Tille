// Browser-neutral persisted contract: reject malformed data, never repair it.
export function tagKey(value) {
  return value.normalize('NFC').trim().toLowerCase().normalize('NFC');
}

export function eventTags(event) {
  if (!Object.hasOwn(event, 'tags')) return [];
  const tags = event.tags;
  if (!Array.isArray(tags) || tags.length > 20) throw new Error('Event-tags: maximal 20 Einträge erforderlich.');
  const keys = new Set();
  for (const tag of tags) {
    if (typeof tag !== 'string' || !tag || tag !== tag.trim().normalize('NFC') || [...tag].length > 60
      || /[\p{Cc}\p{Cf}<>]|(?:javascript|data|blob):|;base64,/iu.test(tag)
      || /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/.test(tag)) {
      throw new Error('Event-tags: ungültiger persistierter Tag.');
    }
    const key = tagKey(tag);
    if (keys.has(key)) throw new Error('Event-tags: doppelte Tag-Keys.');
    keys.add(key);
  }
  return [...tags];
}

// Input is the unfiltered, chronologically sorted visible month.
export function monthTags(events) {
  const tags = new Map();
  for (const event of events) {
    if (event.status === 'archived') continue;
    for (const label of eventTags(event)) {
      const key = tagKey(label);
      if (!tags.has(key)) tags.set(key, { key, label });
    }
  }
  return [...tags.values()];
}

export function retainAvailableTagKeys(active, available) {
  const keys = new Set(available.map(tag => tag.key));
  return new Set([...active].filter(key => keys.has(key)));
}

export function matchesEventTags(event, active) {
  const tags = eventTags(event);
  return !active.size || tags.some(tag => active.has(tagKey(tag)));
}

export function renderEventTags(event) {
  const tags = eventTags(event);
  const escape = text => text.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  return tags.length ? `<div class="event-tags" aria-label="Tags">${tags.map(tag => `<span class="event-tag">${escape(tag)}</span>`).join('')}</div>` : '';
}
