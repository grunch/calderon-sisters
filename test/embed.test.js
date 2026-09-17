import test, { afterEach } from 'node:test';
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

// Only one embedded game may be alive at a time, so every test gives its own back.
const alive = [];
async function hosted(host) {
  const embedded = await createEmbeddedGame(host);
  alive.push(embedded);
  return embedded;
}
afterEach(() => {
  while (alive.length > 0) alive.pop().destroy();
});

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
  const embedded = await hosted({
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
  const embedded = await hosted({
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
  const embedded = await hosted({
    ctx: fakeContext(MIN_VIEW_WIDTH * 2, VIEW_HEIGHT * 2), assetRoot: './', input: fakeInput(),
    audio: fakeAudio(), settings: memorySettings(), loadAssets: async () => {}
  });

  assert.deepStrictEqual(embedded.viewport, { scale: 2, viewWidth: MIN_VIEW_WIDTH });
});

test('the level-clear callback reaches the host', async () => {
  const input = fakeInput();
  let cleared = 0;
  const embedded = await hosted({
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
  const embedded = await hosted({
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

function host(overrides = {}) {
  return {
    ctx: fakeContext(), assetRoot: './', input: fakeInput(), audio: fakeAudio(),
    settings: memorySettings(), loadAssets: async () => {}, ...overrides
  };
}

test('a second embedded game is refused while the first one is alive', async () => {
  const first = await hosted(host());

  await assert.rejects(createEmbeddedGame(host()), /una sola/);

  first.advance(STEP);
  assert.strictEqual(first.state, 'select', 'the first one is not disturbed');
});

test('a second game is refused even while the first is still loading', async () => {
  let finishLoading;
  const loading = new Promise((resolve) => { finishLoading = resolve; });
  const first = hosted(host({ loadAssets: () => loading }));

  await assert.rejects(createEmbeddedGame(host()), /una sola/);

  finishLoading();
  assert.strictEqual((await first).state, 'select');
});

test('destroying the embedded game makes room for the next one', async () => {
  const first = await hosted(host());
  first.destroy();

  const second = await hosted(host());

  assert.strictEqual(second.state, 'select');
});

test('a game that failed to load does not keep the slot taken', async () => {
  await assert.rejects(
    createEmbeddedGame(host({ loadAssets: async () => { throw new Error('sin red'); } })),
    /sin red/
  );

  const next = await hosted(host());

  assert.strictEqual(next.state, 'select');
});

test('a game that failed to start does not keep the slot taken', async () => {
  const brokenSettings = { load() { throw new Error('guardado roto'); }, save() {} };
  await assert.rejects(createEmbeddedGame(host({ settings: brokenSettings })), /guardado roto/);

  const next = await hosted(host());

  assert.strictEqual(next.state, 'select');
});

test('a rejected host contract does not take the slot either', async () => {
  await assert.rejects(createEmbeddedGame(host({ ctx: undefined })), /ctx/);

  const next = await hosted(host());

  assert.strictEqual(next.state, 'select');
});

test('a destroyed game leaves the shared world alone for whoever comes next', async () => {
  const first = await hosted(host());
  first.destroy();
  const audio = fakeAudio();
  const second = await hosted(host({ audio }));
  const callsBefore = audio.calls.length;

  first.destroy();
  first.advance(1);

  assert.strictEqual(audio.calls.length, callsBefore, 'the old handle cannot reach the new host');
  assert.strictEqual(second.state, 'select');
});
