// Admin V2 build badge helper.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize visible build/version badges for cache-safe testing.

const DEFAULT_BADGE_ID = 'adminBuildBadge';

export function ensureBuildBadge(options = {}) {
  const id = options.id || DEFAULT_BADGE_ID;
  let badge = document.getElementById(id);

  if (!badge) {
    badge = document.createElement('div');
    badge.id = id;
    badge.style.position = 'fixed';
    badge.style.left = options.left || '8px';
    badge.style.bottom = options.bottom || '26px';
    badge.style.zIndex = String(options.zIndex || 99999);
    badge.style.padding = options.padding || '4px 6px';
    badge.style.border = options.border || '1px solid #111';
    badge.style.background = options.background || '#fff';
    badge.style.color = options.color || '#111';
    badge.style.font = options.font || '11px/1.2 monospace';
    badge.style.pointerEvents = 'none';
    document.body.appendChild(badge);
  }

  return badge;
}

export function setBuildBadge(label, options = {}) {
  const badge = ensureBuildBadge(options);
  badge.textContent = String(label || '').trim();
  return badge;
}

export function clearBuildBadge(options = {}) {
  const id = options.id || DEFAULT_BADGE_ID;
  const badge = document.getElementById(id);
  if (badge) badge.remove();
}

export function formatBuildLabel(scope, version) {
  const safeScope = String(scope || 'admin-v2').trim();
  const safeVersion = String(version || '').trim();
  return safeVersion ? safeScope + '-' + safeVersion + ' geladen' : safeScope + ' geladen';
}
