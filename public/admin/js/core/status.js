// Admin V2 status helpers.
// Pure utility module. Not loaded by Admin V2 yet.
// Purpose: centralize status message handling before existing save/upload UX is migrated.

export const STATUS_TYPES = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  LOADING: 'loading'
});

export function createStatus(type, message, details = '') {
  return {
    type: normalizeStatusType(type),
    message: String(message || '').trim(),
    details: String(details || '').trim(),
    timestamp: new Date().toISOString()
  };
}

export function normalizeStatusType(type) {
  const value = String(type || '').trim().toLowerCase();
  return Object.values(STATUS_TYPES).includes(value) ? value : STATUS_TYPES.INFO;
}

export function statusLabel(type) {
  switch (normalizeStatusType(type)) {
    case STATUS_TYPES.SUCCESS:
      return 'OK';
    case STATUS_TYPES.WARNING:
      return 'Warnung';
    case STATUS_TYPES.ERROR:
      return 'Fehler';
    case STATUS_TYPES.LOADING:
      return 'Lädt';
    case STATUS_TYPES.INFO:
    default:
      return 'Info';
  }
}

export function statusText(status) {
  if (!status) return '';
  const label = statusLabel(status.type);
  const message = String(status.message || '').trim();
  const details = String(status.details || '').trim();
  return details ? label + ': ' + message + ' · ' + details : label + ': ' + message;
}

export function setStatusText(element, status) {
  if (!element) return;
  element.textContent = statusText(status);
  element.dataset.statusType = normalizeStatusType(status?.type);
}

export function clearStatusText(element) {
  if (!element) return;
  element.textContent = '';
  delete element.dataset.statusType;
}

export function success(message, details = '') {
  return createStatus(STATUS_TYPES.SUCCESS, message, details);
}

export function info(message, details = '') {
  return createStatus(STATUS_TYPES.INFO, message, details);
}

export function warning(message, details = '') {
  return createStatus(STATUS_TYPES.WARNING, message, details);
}

export function error(message, details = '') {
  return createStatus(STATUS_TYPES.ERROR, message, details);
}

export function loading(message = 'Bitte warten...', details = '') {
  return createStatus(STATUS_TYPES.LOADING, message, details);
}
