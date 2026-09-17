import test from 'node:test';
import assert from 'node:assert';
import { advance, STEP, MAX_STEPS } from '../src/core/timestep.js';
import { computeViewport } from '../src/core/viewport.js';
import { boxOf, boxesOverlap, overlaps } from '../src/core/collision.js';
import { ActionState } from '../src/core/actions.js';
import { hiResRects, CHARACTER_SHEET } from '../src/core/sprite-math.js';

test('timestep runs 60 steps per second at any frame rate', () => {
  for (const fps of [24, 30, 60, 144, 240]) {
    let accumulator = 0;
    let steps = 0;
    for (let i = 0; i < fps * 10; i++) {
      const result = advance(accumulator, 1 / fps);
      accumulator = result.accumulator;
      steps += result.steps;
    }

    assert.ok(Math.abs(steps - 600) <= 1, `${fps}fps ran ${steps} steps`);
  }
});

test('timestep drops the backlog after a long stall and ignores bad input', () => {
  const stalled = advance(0, 10);

  assert.strictEqual(stalled.steps, MAX_STEPS);
  assert.ok(stalled.accumulator < STEP);
  assert.strictEqual(advance(0, NaN).steps, 0);
  assert.strictEqual(advance(0, -1).steps, 0);
});

test('viewport picks the biggest whole-number scale that fits', () => {
  const view = computeViewport(1920, 1080, 1);

  assert.strictEqual(view.scale, 4);
  assert.strictEqual(view.pixelHeight, 960);
  assert.ok(view.pixelWidth <= 1920);
});

test('viewport shows more of the level on wide screens, within limits', () => {
  const wide = computeViewport(1920, 1080, 1);
  const ultraWide = computeViewport(3440, 1080, 1);
  const square = computeViewport(800, 800, 1);

  assert.strictEqual(wide.viewWidth, 432);
  assert.strictEqual(ultraWide.viewWidth, 432);
  assert.strictEqual(square.viewWidth, 266);
});

test('viewport never shows less than the classic 256px width', () => {
  const tall = computeViewport(400, 900, 1);

  assert.strictEqual(tall.scale, 1);
  assert.ok(tall.viewWidth >= 256);
});

test('viewport uses device pixels on HiDPI screens but reports CSS sizes', () => {
  const view = computeViewport(960, 540, 2);

  assert.strictEqual(view.scale, 4);
  assert.strictEqual(view.cssHeight, 480);
  assert.strictEqual(view.pixelHeight, 960);
});

test('boxOf applies the hitbox offset', () => {
  const koopa = { pos: [100, 50], hitbox: [2, 8, 12, 24] };

  assert.deepStrictEqual(boxOf(koopa), { x: 102, y: 58, w: 12, h: 24 });
});

test('boxes that touch count as overlapping, separated ones do not', () => {
  const a = { x: 0, y: 0, w: 16, h: 16 };

  assert.ok(boxesOverlap(a, { x: 16, y: 0, w: 16, h: 16 }));
  assert.ok(!boxesOverlap(a, { x: 17, y: 0, w: 16, h: 16 }));
  assert.ok(!boxesOverlap(a, { x: 0, y: 40, w: 16, h: 16 }));
});

test('overlaps compares two entities', () => {
  const player = { pos: [10, 10], hitbox: [0, 0, 16, 16] };
  const coin = { pos: [20, 20], hitbox: [0, 0, 16, 16] };
  const farCoin = { pos: [200, 20], hitbox: [0, 0, 16, 16] };

  assert.ok(overlaps(player, coin));
  assert.ok(!overlaps(player, farCoin));
});

test('an action is down while any source holds it', () => {
  const actions = new ActionState();

  actions.press('JUMP', 'keyboard');
  actions.press('JUMP', 'touch');
  actions.release('JUMP', 'keyboard');

  assert.ok(actions.isDown('JUMP'));

  actions.release('JUMP', 'touch');

  assert.ok(!actions.isDown('JUMP'));
});

test('a press is reported once, even if the key was already released', () => {
  const actions = new ActionState();

  actions.press('CONFIRM', 'keyboard');
  actions.release('CONFIRM', 'keyboard');

  assert.ok(actions.consumePress('CONFIRM'));
  assert.ok(!actions.consumePress('CONFIRM'));
});

test('holding a key does not create new presses', () => {
  const actions = new ActionState();

  actions.press('RIGHT', 'keyboard');
  actions.consumePress('RIGHT');
  actions.press('RIGHT', 'keyboard');

  assert.ok(!actions.consumePress('RIGHT'));
});

test('reset forgets held keys and unread presses', () => {
  const actions = new ActionState();

  actions.press('JUMP', 'keyboard');
  actions.reset();

  assert.ok(!actions.isDown('JUMP'));
  assert.ok(!actions.consumePress('JUMP'));
});

test('hi-res sheets map 16px columns to cells and center on the hitbox', () => {
  const big = hiResRects(CHARACTER_SHEET, 96, 0, [16, 32], 100, 50);

  assert.deepStrictEqual(big.source, [6 * 128, 0, 128, 128]);
  assert.deepStrictEqual(big.dest, [92, 50, 32, 32]);
});

test('the small form is drawn enlarged but still stands on the hitbox floor', () => {
  const small = hiResRects(CHARACTER_SHEET, 80, 32, [16, 16], 100, 50);

  assert.deepStrictEqual(small.source, [5 * 128, 128, 128, 64]);
  assert.strictEqual(small.dest[1] + small.dest[3], 50 + 16);
  assert.strictEqual(small.dest[0] + small.dest[2] / 2, 100 + 8);
});

test('clearPresses forgets old taps but keeps held keys down', () => {
  const actions = new ActionState();

  actions.press('JUMP', 'keyboard');
  actions.clearPresses();

  assert.ok(actions.isDown('JUMP'));
  assert.ok(!actions.consumePress('JUMP'));
});
