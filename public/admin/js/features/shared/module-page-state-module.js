// Admin V2 shared module page state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module page state.

export const MODULE_PAGE_STATE_MODULE_VERSION = 'module-page-state-0';

export function createModulePageStateModule(options = {}) {
  let page = Number.isInteger(Number(options.initialPage)) ? Math.max(1, Number(options.initialPage)) : 1;

  function getPage() {
    return page;
  }

  function setPage(value) {
    page = Number.isInteger(Number(value)) ? Math.max(1, Number(value)) : 1;
    return getState();
  }

  function nextPage() {
    page += 1;
    return getState();
  }

  function previousPage() {
    page = Math.max(1, page - 1);
    return getState();
  }

  function getState() {
    return { page };
  }

  return {
    version: MODULE_PAGE_STATE_MODULE_VERSION,
    getPage,
    setPage,
    nextPage,
    previousPage,
    getState
  };
}
