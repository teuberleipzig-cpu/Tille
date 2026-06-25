// Admin V2 shared module registry module placeholder.
// Not loaded by Admin V2 yet.
// Purpose: define the future boundary for module registration state.

export const MODULE_REGISTRY_MODULE_VERSION = 'module-registry-0';

export function createModuleRegistryModule() {
  const modules = new Map();

  function registerModule(name, moduleValue) {
    if (typeof name !== 'string' || !name) return false;
    modules.set(name, moduleValue || null);
    return true;
  }

  function hasModule(name) {
    return modules.has(name);
  }

  function getModule(name) {
    return modules.has(name) ? modules.get(name) : null;
  }

  function unregisterModule(name) {
    return modules.delete(name);
  }

  function listModuleNames() {
    return [...modules.keys()];
  }

  function clearModules() {
    modules.clear();
    return listModuleNames();
  }

  return {
    version: MODULE_REGISTRY_MODULE_VERSION,
    registerModule,
    hasModule,
    getModule,
    unregisterModule,
    listModuleNames,
    clearModules
  };
}
