// Admin V2 DOM helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: replace scattered DOM helper code step by step with small explicit helpers.

export function byId(id, root = document) {
  return root.getElementById ? root.getElementById(id) : document.getElementById(id);
}

export function one(selector, root = document) {
  return root.querySelector(selector);
}

export function all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function on(element, eventName, handler, options) {
  if (!element || !eventName || !handler) return () => {};
  element.addEventListener(eventName, handler, options);
  return () => element.removeEventListener(eventName, handler, options);
}

export function onReady(handler) {
  if (!handler) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', handler, { once: true });
  else handler();
}

export function setText(element, value) {
  if (!element) return;
  element.textContent = String(value ?? '');
}

export function setHtml(element, value) {
  if (!element) return;
  element.innerHTML = String(value ?? '');
}

export function setValue(element, value) {
  if (!element) return;
  element.value = String(value ?? '');
}

export function getValue(element) {
  return String(element?.value ?? '');
}

export function show(element) {
  if (!element) return;
  element.classList.remove('hidden');
}

export function hide(element) {
  if (!element) return;
  element.classList.add('hidden');
}

export function toggleHidden(element, shouldHide) {
  if (!element) return;
  element.classList.toggle('hidden', Boolean(shouldHide));
}

export function setDisabled(element, disabled) {
  if (!element) return;
  element.disabled = Boolean(disabled);
}

export function createElement(tagName, options = {}) {
  const element = document.createElement(tagName);
  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.text != null) element.textContent = String(options.text);
  if (options.html != null) element.innerHTML = String(options.html);
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value != null) element.setAttribute(name, String(value));
    }
  }
  return element;
}

export function replaceChildren(element, children) {
  if (!element) return;
  element.replaceChildren(...children.filter(Boolean));
}

export function dispatchInput(element) {
  if (!element) return;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

export function closest(element, selector) {
  return element?.closest ? element.closest(selector) : null;
}
