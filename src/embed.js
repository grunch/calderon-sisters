// Entry point for running the game INSIDE another program (main.js is the one
// for its own page). The host owns the canvas, the frame loop, the controls,
// the sound and the saved settings; the rules of the game are exactly the same.
import { Game } from './game/game.js';
import { loadImages } from './core/assets.js';
import { advance, STEP } from './core/timestep.js';
import { computeViewport } from './core/viewport.js';
import { IMAGES, SOUNDS, MUSIC } from './assets-manifest.js';

// What the host's audio has to be able to play, as { name: file under assetRoot }.
export { SOUNDS, MUSIC };

const REQUIRED = ['ctx', 'assetRoot', 'input', 'audio', 'settings'];

// The entities read one shared `world` (game/world.js), so two games alive at
// once would play each other's level. Only one may exist until it is destroyed.
let slotTaken = false;

/**
 * @param {object} host
 * @param {CanvasRenderingContext2D} host.ctx  where to draw; its canvas size sets the scale
 * @param {string} host.assetRoot              folder holding sprites/ and sounds/, with a trailing slash
 * @param {object} host.input                  isDown, consumePress, clearPresses, reset (see core/input.js)
 * @param {object} host.audio                  muted, setMuted, play, playMusic, stopMusic, pauseAll, resumeAll
 * @param {object} host.settings               load(name, fallback), save(name, value) for 'character', 'highScore', 'muted'
 * @param {Function} [host.onLevelClear]       called once each time a level is completed
 * @param {boolean} [host.isTouch]             which hint the select screen shows; the touch one names no keys
 * @param {Function} [host.loadAssets]         replaces the image loader (tests)
 * @returns {Promise<object>} the handle: advance, render, destroy, state, viewport, game
 * @throws if the host contract is incomplete, or another embedded game is still alive
 */
export async function createEmbeddedGame(host) {
  const missing = REQUIRED.filter((name) => host?.[name] === undefined || host[name] === null);
  if (missing.length > 0) {
    throw new Error(`createEmbeddedGame: falta ${missing.join(', ')}`);
  }
  if (slotTaken) {
    throw new Error('createEmbeddedGame: solo puede haber una sola partida incrustada a la vez; llama destroy() en la anterior');
  }
  const { ctx, assetRoot, input, audio, settings, onLevelClear, isTouch = true, loadAssets = loadImages } = host;

  slotTaken = true; // taken before the first await, so a concurrent call is refused too
  let game;
  let viewport;
  try {
    await loadAssets(IMAGES, assetRoot);
    game = new Game({ input, audio, settings, onLevelClear, isTouch });
    const { scale, viewWidth } = computeViewport(ctx.canvas.width, ctx.canvas.height);
    viewport = Object.freeze({ scale, viewWidth });
    game.setViewport(viewport);
  } catch (error) {
    slotTaken = false; // a game that never started must not block the next one
    throw error;
  }

  let accumulator = 0;
  let destroyed = false;

  return {
    game,
    viewport,

    /** 'select', 'playing', 'paused', 'gameover' or 'clear'. */
    get state() {
      return game.state;
    },

    /** Simulates `seconds` of play in fixed 60Hz steps; returns how many ran. */
    advance(seconds) {
      if (destroyed) return 0;
      const result = advance(accumulator, seconds);
      accumulator = result.accumulator;
      for (let i = 0; i < result.steps; i++) game.update(STEP);
      return result.steps;
    },

    /** Draws the current frame on the host's canvas. */
    render() {
      if (!destroyed) game.render(ctx);
    },

    /**
     * The host is done (the player walked away): the run in progress is simply
     * dropped and another embedded game may be created. Safe to call twice.
     */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      input.reset();
      audio.stopMusic();
      slotTaken = false;
    }
  };
}
