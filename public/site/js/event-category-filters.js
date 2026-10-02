// Sole owner of category button children. Search and panel DOM are untouched.
export function renderCategoryFilters(root, categories, active) {
  const available = new Set(categories.map(c => c.key));
  for (const button of root.querySelectorAll('[data-filter]')) {
    if (!available.has(button.dataset.filter)) button.remove();
  }
  for (const [index, category] of categories.entries()) {
    let button = root.querySelector(`[data-filter="${category.key}"]`);
    if (!button) {
      button = root.ownerDocument.createElement('button');
      button.type = 'button'; button.className = 'side-filter';
      button.dataset.filter = category.key;
    }
    // Keep visual, keyboard and screen-reader order identical across month changes.
    if (root.children[index] !== button) root.insertBefore(button, root.children[index] || null);
    button.textContent = category.label;
    button.style.setProperty('--event-color', category.color);
    button.classList.toggle('active', active === category.key);
    button.setAttribute('aria-pressed', String(active === category.key));
  }
}
