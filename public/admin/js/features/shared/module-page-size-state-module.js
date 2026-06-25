// Admin V2 shared module page size state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for simple module page size state.

export const MODULE_PAGE_SIZE_STATE_MODULE_VERSION = 'module-page-size-state-0';

export function createModulePageSizeStateModule(options = {}) {
  let pageSize = Number.isInteger(Number(options.initialPageSize)) ? Math.max(1, Number(options.initialPageSize)) : 25;

  function getPageSize() {
    return pageSize;
  }

  function setPageSize(value) {
    pageSize = Number.isInteger(Number(value)) ? Math.max(1, Number(value)) : 25;
    return getState();
  }

  function resetPageSize() {
    pageSize = 25;
    return getState();
  }

  function getState() {
    return { pageSize };
  }

  return {
    version: MODULE_PAGE_SIZE_STATE_MODULE_VERSION,
    getPageSize,
    setPageSize,
    resetPageSize,
    getState
  };
}
