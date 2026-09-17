// localStorage can be missing or blocked (private windows), and the game must
// work without it, so every access is guarded and failures are only reported.
export function loadSetting(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`No se pudo leer "${key}": ${error.message}`);
    return fallback;
  }
}

export function saveSetting(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar "${key}": ${error.message}`);
  }
}
