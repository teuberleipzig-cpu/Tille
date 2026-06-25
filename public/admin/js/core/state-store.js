// Admin V2 state store helper.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: provide a small explicit state container before existing global state is migrated.

export function createStateStore(initialState = {}) {
  let state = structuredCloneSafe(initialState);
  const listeners = new Set();

  function getState() {
    return state;
  }

  function getSnapshot() {
    return structuredCloneSafe(state);
  }

  function setState(patch, meta = {}) {
    const previous = state;
    const nextPatch = typeof patch === 'function' ? patch(previous) : patch;
    state = {
      ...previous,
      ...(nextPatch || {})
    };
    notify(previous, state, meta);
    return state;
  }

  function replaceState(nextState, meta = {}) {
    const previous = state;
    state = structuredCloneSafe(nextState || {});
    notify(previous, state, meta);
    return state;
  }

  function reset(meta = {}) {
    return replaceState(initialState, meta);
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify(previous, current, meta) {
    for (const listener of listeners) {
      listener(current, previous, meta);
    }
  }

  return {
    getState,
    getSnapshot,
    setState,
    replaceState,
    reset,
    subscribe
  };
}

export function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function markDirty(store, dirty = true) {
  if (!store || typeof store.setState !== 'function') return;
  store.setState({ dirty: Boolean(dirty) }, { source: 'markDirty' });
}

export function setSelectedIndex(store, key, index) {
  if (!store || typeof store.setState !== 'function') return;
  store.setState({ [key]: Number(index) }, { source: 'setSelectedIndex', key });
}

export function getSelectedItem(list, index) {
  if (!Array.isArray(list)) return null;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= list.length) return null;
  return list[i];
}
