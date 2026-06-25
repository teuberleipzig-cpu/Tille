// Admin V2 modular entry placeholder.
// Not loaded by Admin V2 yet.
// Purpose: provide a controlled future entry point for small feature-by-feature migration.

import { formatBuildLabel } from './core/build-badge.js';

export const ADMIN_MODULAR_APP_VERSION = 'admin-v2-modular-0';

export function describeModularApp() {
  return {
    version: ADMIN_MODULAR_APP_VERSION,
    label: formatBuildLabel('admin-v2-modular', '0'),
    loaded: false,
    activeFeatures: []
  };
}

export function initModularAdminApp() {
  // Intentionally empty.
  // This function will only be wired into Admin V2 after individual modules are migrated and tested.
  return describeModularApp();
}
