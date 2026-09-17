import test from 'node:test';
import assert from 'node:assert';
import { Game } from '../src/game/game.js';
import { createEmbeddedGame } from '../src/embed.js';
import { loadImages } from '../src/core/assets.js';
import { IMAGES } from '../src/assets-manifest.js';
import { VIEW_HEIGHT, MIN_VIEW_WIDTH } from '../src/config.js';
import { STEP, MAX_STEPS } from '../src/core/timestep.js';

const SECOND = Math.round(1 / STEP);

/** An input the test drives by hand, with the same interface the Game reads. */
function fakeInput() {
  const down = new Set();
  const presses = new Set();
  return {
    resets: 0,
    hold(action) { down.add(action); presses.add(action); },
    release(action) { down.delete(action); },
    isDown: (action) => down.has(action),
    consumePress: (action) => presses.delete(action),
    clearPresses() { presses.clear(); },
    reset() { down.clear(); presses.clear(); this.resets += 1; }
  };
}

function fakeAudio() {
  const calls = [];
  const record = (name) => (...args) => { calls.push([name, ...args]); };
  return {
    calls,
    muted: false,
    setMuted(muted) { this.muted = muted; calls.push(['setMuted', muted]); },
    play: record('play'),
    playMusic: record('playMusic'),
    stopMusic: record('stopMusic'),
    pauseAll: record('pauseAll'),
    resumeAll: record('resumeAll')
  };
}

function memorySettings(initial = {}) {
  const values = { ...initial };
  return {
    values,
    load: (name, fallback) => (name in values ? values[name] : fallback),
    save(name, value) { values[name] = value; }
  };
}

/** A 2D context that accepts any call, and counts them. */
function fakeContext(width = MIN_VIEW_WIDTH, height = VIEW_HEIGHT) {
  const state = { calls: 0, canvas: { width, height } };
  return new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      return () => { target.calls += 1; };
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

function run(game, seconds) {
  for (let i = 0; i < seconds * SECOND; i++) game.update(STEP);
}

function startPlaying(game, input) {
  input.hold('CONFIRM');
  game.update(STEP);
  input.release('CONFIRM');
}

test('the game runs with everything injected and no browser globals', () => {
  assert.strictEqual(typeof globalThis.window, 'undefined');
  const input = fakeInput();
  const game = new Game({ input, audio: fakeAudio(), settings: memorySettings(), isTouch: true });

  run(game, 1);
  startPlaying(game, input);
  run(game, 1);

  assert.strictEqual(game.state, 'playing');
  assert.strictEqual(game.session.lives, 3);
});

test('the chosen character and the high score go to the injected settings', () => {
  const input = fakeInput();
  const settings = memorySettings({ character: 'mila' });
  const game = new Game({ input, audio: fakeAudio(), settings, isTouch: true });

  assert.strictEqual(game.character.id, 'mila');
  startPlaying(game, input);
  game.addScore(700);
  game.levelCleared();
  run(game, 2);

  assert.strictEqual(settings.values.character, 'mila');
  assert.ok(settings.values.highScore >= 700);
});

test('clearing the level is announced exactly once, when the results appear', () => {
  const input = fakeInput();
  let cleared = 0;
  const game = new Game({
    input, audio: fakeAudio(), settings: memorySettings(), isTouch: true,
    onLevelClear: () => { cleared += 1; }
  });
  startPlaying(game, input);

  game.levelCleared();
  run(game, 1);
  assert.strictEqual(cleared, 0, 'she is still walking into the house');
  run(game, 1);
  assert.strictEqual(game.state, 'clear');
  run(game, 3);

  assert.strictEqual(cleared, 1);
});

test('losing every life is not announced as a cleared level', () => {
  const input = fakeInput();
  let cleared = 0;
  const game = new Game({
    input, audio: fakeAudio(), settings: memorySettings(), isTouch: true,
    onLevelClear: () => { cleared += 1; }
  });
  startPlaying(game, input);

  game.playerDied();
  game.playerDied();
  game.playerDied();

  assert.strictEqual(game.state, 'gameover');
  assert.strictEqual(cleared, 0);
});

test('without injected settings the game still uses localStorage, as before', () => {
  const stored = new Map();
  globalThis.window = {
    matchMedia: () => ({ matches: false }),
    localStorage: {
      getItem: (key) => (stored.has(key) ? stored.get(key) : null),
      setItem: (key, value) => stored.set(key, value)
    }
  };
  try {
    const input = fakeInput();
    const game = new Game({ input, audio: fakeAudio() });
    startPlaying(game, input);

    assert.strictEqual(stored.get('calderon-bros.character'), '"maite"');
    assert.strictEqual(game.isTouch, false);
  } finally {
    delete globalThis.window;
  }
});

test('images load from the asset root they are given', async () => {
  const requested = [];
  globalThis.Image = class {
    set src(value) {
      requested.push(value);
      queueMicrotask(() => this.onload());
    }
  };
  try {
    await loadImages({ tiles: 'sprites/tiles.png' }, 'assets/tele/');
  } finally {
    delete globalThis.Image;
  }

  assert.deepStrictEqual(requested, ['assets/tele/sprites/tiles.png']);
});

test('the embedded game loads its images from the host root before starting', async () => {
  const loads = [];
  const embedded = await createEmbeddedGame({
    ctx: fakeContext(), assetRoot: 'assets/tele/', input: fakeInput(), audio: fakeAudio(),
    settings: memorySettings(),
    loadAssets: async (manifest, root) => { loads.push([manifest, root]); }
  });

  assert.deepStrictEqual(loads, [[IMAGES, 'assets/tele/']]);
  assert.strictEqual(embedded.state, 'select');
});

test('the host drives the loop: advance runs fixed steps and render draws on its canvas', async () => {
  const input = fakeInput();
  const ctx = fakeContext();
  // The real loader, so render finds every image it asks for.
  globalThis.Image = class {
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  const embedded = await createEmbeddedGame({
    ctx, assetRoot: './', input, audio: fakeAudio(), settings: memorySettings()
  }).finally(() => { delete globalThis.Image; });

  input.hold('CONFIRM');
  embedded.advance(STEP);
  assert.strictEqual(embedded.state, 'playing');
  assert.strictEqual(embedded.advance(10), MAX_STEPS, 'a long stall is not caught up');
  assert.strictEqual(embedded.advance(-1), 0);

  embedded.render();
  assert.ok(ctx.calls > 0);
});

test('the embedded view is the classic 256 wide screen at the canvas scale', async () => {
  const embedded = await createEmbeddedGame({
    ctx: fakeContext(MIN_VIEW_WIDTH * 2, VIEW_HEIGHT * 2), assetRoot: './', input: fakeInput(),
    audio: fakeAudio(), settings: memorySettings(), loadAssets: async () => {}
  });

  assert.deepStrictEqual(embedded.viewport, { scale: 2, viewWidth: MIN_VIEW_WIDTH });
});

test('the level-clear callback reaches the host', async () => {
  const input = fakeInput();
  let cleared = 0;
  const embedded = await createEmbeddedGame({
    ctx: fakeContext(), assetRoot: './', input, audio: fakeAudio(), settings: memorySettings(),
    loadAssets: async () => {}, onLevelClear: () => { cleared += 1; }
  });
  input.hold('CONFIRM');
  embedded.advance(STEP);
  input.release('CONFIRM');

  embedded.game.levelCleared();
  for (let i = 0; i < 2 * SECOND; i++) embedded.advance(STEP);

  assert.strictEqual(cleared, 1);
});

test('destroy stops the music, drops held keys and freezes the game', async () => {
  const input = fakeInput();
  const audio = fakeAudio();
  const ctx = fakeContext();
  const embedded = await createEmbeddedGame({
    ctx, assetRoot: './', input, audio, settings: memorySettings(), loadAssets: async () => {}
  });
  const resetsBefore = input.resets;

  embedded.destroy();
  const drawnBefore = ctx.calls;

  assert.deepStrictEqual(audio.calls.at(-1), ['stopMusic']);
  assert.strictEqual(input.resets, resetsBefore + 1);
  assert.strictEqual(embedded.advance(1), 0);
  embedded.render();
  assert.strictEqual(ctx.calls, drawnBefore);
});

test('a missing piece of the host contract fails loudly', async () => {
  await assert.rejects(
    createEmbeddedGame({ assetRoot: './', input: fakeInput(), audio: fakeAudio(), settings: memorySettings() }),
    /ctx/
  );
});
