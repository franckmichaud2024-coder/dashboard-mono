// Seulement les données métier sont synchronisées entre les appareils.
// Les préférences d'interface (page active, menu, ordre de navigation, scroll, etc.)
// restent locales à chaque navigateur pour éviter les sauts d'écran.
export const CLOUD_STORAGE_KEYS = [
  "dashboard-mono-decongelation-v2",
  "dashboard-mono-riz-sec-v1",
  "dashboard-mono-employes-v1",
  "dashboard-mono-vacances-v1",
  "dashboard-mono-banques-v1",
];

const CHANGE_EVENT = "expedition:local-state-changed";
const REMOTE_EVENT = "expedition:remote-state-applied";

export function notifyLocalStateChange(key) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

export function onLocalStateChange(callback) {
  const handler = (event) => callback?.(event.detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export function onRemoteStateApplied(callback) {
  const handler = (event) => callback?.(event.detail);
  window.addEventListener(REMOTE_EVENT, handler);
  return () => window.removeEventListener(REMOTE_EVENT, handler);
}

export function readLocalSnapshot() {
  const storage = {};
  for (const key of CLOUD_STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value !== null) storage[key] = value;
  }
  return storage;
}

export function applyLocalSnapshot(storage = {}) {
  const changedKeys = [];

  for (const key of CLOUD_STORAGE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(storage, key)) continue;

    const nextValue = storage[key];
    const currentValue = window.localStorage.getItem(key);
    if (currentValue === nextValue) continue;

    window.localStorage.setItem(key, nextValue);
    changedKeys.push(key);
  }

  if (changedKeys.length > 0) {
    window.dispatchEvent(
      new CustomEvent(REMOTE_EVENT, { detail: { keys: changedKeys } })
    );
  }

  return changedKeys;
}
