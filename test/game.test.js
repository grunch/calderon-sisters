import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARACTERS, characterById, characterImages } from '../src/game/characters.js';
import { stepSelection, initialSelection } from '../src/ui/select-logic.js';
import {
  createSession, addScore, addCoin, loseLife, tickClock, COINS_PER_LIFE
} from '../src/game/session.js';
import { hudFields, padNumber } from '../src/ui/hud-format.js';
import { IMAGES, SOUNDS, MUSIC } from '../src/assets-manifest.js';
import { ASSET_ROOT } from '../src/config.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const NO_KEYS = { LEFT: false, RIGHT: false, CONFIRM: false };

test('offers Maite and Mila', () => {
  assert.deepStrictEqual(CHARACTERS.map((c) => c.name), ['MAITE', 'MILA']);
  assert.strictEqual(characterById('mila').name, 'MILA');
  assert.strictEqual(characterById('nobody'), CHARACTERS[0]);
  assert.strictEqual(characterImages().length, 4);
});

test('every file in the asset manifest exists on disk', () => {
  const files = [...Object.values(IMAGES), ...Object.values(SOUNDS), ...Object.values(MUSIC)];

  for (const file of files) {
    const onDisk = path.join(here, '..', ASSET_ROOT, file);
    assert.ok(fs.existsSync(onDisk), `${file} is missing`);
  }
});

test('the selection cursor moves once per press and wraps around', () => {
  const right = stepSelection(initialSelection(0), { ...NO_KEYS, RIGHT: true }, 2);
  const held = stepSelection(right, { ...NO_KEYS, RIGHT: true }, 2);
  const released = stepSelection(held, NO_KEYS, 2);
  const wrapped = stepSelection(released, { ...NO_KEYS, RIGHT: true }, 2);

  assert.strictEqual(right.index, 1);
  assert.strictEqual(held.index, 1);
  assert.strictEqual(wrapped.index, 0);
});

test('confirm picks the highlighted character without mutating the old state', () => {
  const start = initialSelection(1);
  const snapshot = JSON.stringify(start);
  const done = stepSelection(start, { ...NO_KEYS, CONFIRM: true }, 2);

  assert.strictEqual(done.confirmed, true);
  assert.strictEqual(done.index, 1);
  assert.strictEqual(JSON.stringify(start), snapshot);
});

test('a session starts with three lives and a full clock', () => {
  const session = createSession('maite');

  assert.strictEqual(session.lives, 3);
  assert.strictEqual(session.time, 400);
  assert.strictEqual(session.score, 0);
});

test('score and coins never mutate the previous session', () => {
  const session = createSession('maite');
  const richer = addCoin(addScore(session, 100));

  assert.strictEqual(session.score, 0);
  assert.strictEqual(richer.score, 300);
  assert.strictEqual(richer.coins, 1);
});

test('one hundred coins become an extra life', () => {
  let session = createSession('mila');
  for (let i = 0; i < COINS_PER_LIFE; i++) session = addCoin(session);

  assert.strictEqual(session.coins, 0);
  assert.strictEqual(session.lives, 4);
});

test('losing a life refills the clock and never goes below zero', () => {
  let session = { ...createSession('mila'), time: 12 };
  session = loseLife(session);

  assert.strictEqual(session.lives, 2);
  assert.strictEqual(session.time, 400);
  assert.strictEqual(loseLife(loseLife(loseLife(session))).lives, 0);
});

test('the clock loses one unit every 0.4 seconds and stops at zero', () => {
  const session = createSession('maite');
  const later = tickClock(session, 2);
  const expired = tickClock({ ...session, time: 1 }, 5);

  assert.strictEqual(later.time, 395);
  assert.strictEqual(expired.time, 0);
});

test('the HUD pads its numbers like the original', () => {
  const fields = hudFields({ ...createSession('maite'), score: 1250, coins: 7, time: 95 }, 'MAITE');

  assert.strictEqual(padNumber(7, 2), '07');
  assert.deepStrictEqual(fields, [
    { label: 'MAITE', value: '001250' },
    { label: 'MONEDAS', value: '×07' },
    { label: 'MUNDO', value: '1-1' },
    { label: 'TIEMPO', value: '095' },
    { label: 'VIDAS', value: '×3' }
  ]);
});

test('the castle stands on the ground with its door on the exit column', async () => {
  const { castlePlacement, CASTLE } = await import('../src/game/castle-placement.js');
  const exitColumn = 204;
  const box = castlePlacement(exitColumn);

  assert.strictEqual(box.y + box.height, 208); // top of the ground tiles
  assert.strictEqual(box.height, 96);
  const doorCenter = box.x + box.width * CASTLE.doorCenterRatio;
  assert.ok(Math.abs(doorCenter - (exitColumn * 16 + 8)) <= 1, `door at ${doorCenter}`);
});

test('the castle fits inside level 1-1', async () => {
  const { castlePlacement } = await import('../src/game/castle-placement.js');
  const box = castlePlacement(204);

  assert.ok(box.x > 198 * 16 + 16, 'it must not cover the flagpole');
  assert.ok(box.x + box.width <= 212 * 16);
});
