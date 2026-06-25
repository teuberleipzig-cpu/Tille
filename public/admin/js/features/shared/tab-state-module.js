// Admin V2 shared tab state module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for shared tab state.

export const TAB_STATE_MODULE_VERSION = 'tab-state-0';

export function createTabStateModule(options = {}) {
  let activeTab = typeof options.initialActiveTab === 'string' ? options.initialActiveTab : '';

  function getActiveTab() {
    return activeTab;
  }

  function setActiveTab(value) {
    activeTab = typeof value === 'string' ? value : '';
    return activeTab;
  }

  function clearActiveTab() {
    activeTab = '';
    return activeTab;
  }

  function hasActiveTab() {
    return Boolean(activeTab);
  }

  function getState() {
    return { activeTab };
  }

  return {
    version: TAB_STATE_MODULE_VERSION,
    getActiveTab,
    setActiveTab,
    clearActiveTab,
    hasActiveTab,
    getState
  };
}
