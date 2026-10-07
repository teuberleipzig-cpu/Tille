// Sole owner of tag button children; no access to other controls or containers.
export function renderTagFilters(root, tags, active) {
  const available = new Set(tags.map(tag => tag.key));
  const buttons = new Map();
  for (const button of root.querySelectorAll('[data-tag-key]')) {
    if (!available.has(button.dataset.tagKey)) button.remove();
    else buttons.set(button.dataset.tagKey, button);
  }
  root.hidden = !tags.length;
  for (const [index, tag] of tags.entries()) {
    let button = buttons.get(tag.key);
    if (!button) {
      button = root.ownerDocument.createElement('button');
      button.type = 'button';
      button.className = 'tag-filter';
      button.dataset.tagKey = tag.key;
    }
    if (root.children[index] !== button) root.insertBefore(button, root.children[index] || null);
    button.textContent = tag.label;
    button.classList.toggle('active', active.has(tag.key));
    button.setAttribute('aria-pressed', String(active.has(tag.key)));
  }
}
