import test, { afterEach } from 'node:test';
import assert from 'node:assert';
import { localSettings } from '../src/core/storage.js';
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from '../src/config.js';

/** A localStorage that lives in a Map, installed as the browser global. */
function installStorage(initial = {}) {
  const stored = new Map(Object.entries(initial));
  globalThis.window = {
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, value)
    }
  };
  return stored;
}

afterEach(() => {
  delete globalThis.window;
});

test('settings are kept under the Calderón Sisters name', () => {
  const stored = installStorage();

  localSettings.save('character', 'mila');

  assert.strictEqual(stored.get('calderon-sisters.character'), '"mila"');
  assert.deepStrictEqual(Object.keys(STORAGE_KEYS), Object.keys(LEGACY_STORAGE_KEYS));
});

test('what was saved as Calderón Bros is still found after the rename', () => {
  installStorage({ 'calderon-bros.highScore': '1200', 'calderon-bros.character': '"mila"' });

  assert.strictEqual(localSettings.load('highScore', 0), 1200);
  assert.strictEqual(localSettings.load('character', 'maite'), 'mila');
});

test('a value saved under the new name wins over the old one', () => {
  installStorage({ 'calderon-bros.highScore': '1200', 'calderon-sisters.highScore': '3400' });

  assert.strictEqual(localSettings.load('highScore', 0), 3400);
});

test('a new value equal to the fallback is not mistaken for a missing one', () => {
  installStorage({ 'calderon-bros.muted': 'true', 'calderon-sisters.muted': 'false' });

  assert.strictEqual(localSettings.load('muted', false), false);
});

test('reading never rewrites or removes the old keys', () => {
  const stored = installStorage({ 'calderon-bros.highScore': '1200' });

  localSettings.load('highScore', 0);

  assert.deepStrictEqual([...stored.entries()], [['calderon-bros.highScore', '1200']]);
});

test('with nothing saved under either name the fallback is returned', () => {
  installStorage();

  assert.strictEqual(localSettings.load('highScore', 0), 0);
});
