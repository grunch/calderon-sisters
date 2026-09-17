import { STORAGE_KEYS } from '../config.js';

// localStorage can be missing or blocked (private windows), and the game must
// work without it, so every access is guarded and failures are only reported.
/** Reads a JSON value from localStorage; `fallback` when it is missing or unreadable. */
export function loadSetting(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`No se pudo leer "${key}": ${error.message}`);
    return fallback;
  }
}

/** Writes a JSON value to localStorage; a failure is reported and otherwise ignored. */
export function saveSetting(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar "${key}": ${error.message}`);
  }
}

/**
 * Where the game keeps what it remembers, by setting name ('character',
 * 'highScore', 'muted'). A host that embeds the game passes its own instead.
 */
export const localSettings = Object.freeze({
  load: (name, fallback) => loadSetting(STORAGE_KEYS[name], fallback),
  save: (name, value) => saveSetting(STORAGE_KEYS[name], value)
});
