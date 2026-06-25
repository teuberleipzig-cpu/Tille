// Admin V2 shared module query state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module query state.

import { trimText } from '../../core/text.js';

export const MODULE_QUERY_STATE_MODULE_VERSION = 'module-query-state-0';

export function createModuleQueryStateModule(options = {}) {
  let query = trimText(options.initialQuery || '');

  function getQuery() {
    return query;
  }

  function setQuery(value) {
    query = trimText(value || '');
    return getState();
  }

  function clearQuery() {
    query = '';
    return getState();
  }

  function hasQuery() {
    return Boolean(query);
  }

  function getState() {
    return { query, hasQuery: hasQuery() };
  }

  return {
    version: MODULE_QUERY_STATE_MODULE_VERSION,
    getQuery,
    setQuery,
    clearQuery,
    hasQuery,
    getState
  };
}
