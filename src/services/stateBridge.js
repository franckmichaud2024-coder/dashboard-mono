export const CLOUD_STORAGE_KEYS = [
  "dashboard-mono-navigation-order",
  "dashboard-mono-decongelation-v2",
  "dashboard-mono-riz-sec-v1",
  "dashboard-mono-employes-v1",
  "dashboard-mono-vacances-v1",
  "dashboard-mono-banques-v1",
];

const CHANGE_EVENT = "expedition:local-state-changed";

export function notifyLocalStateChange(key) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }));
}

export function onLocalStateChange(callback) {
  const handler = (event) => callback?.(event.detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
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
  for (const key of CLOUD_STORAGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(storage, key)) {
      window.localStorage.setItem(key, storage[key]);
    }
  }
}
