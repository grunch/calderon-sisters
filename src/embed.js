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
 */
export async function createEmbeddedGame(host) {
  const missing = REQUIRED.filter((name) => host?.[name] === undefined || host[name] === null);
  if (missing.length > 0) {
    throw new Error(`createEmbeddedGame: falta ${missing.join(', ')}`);
  }
  const { ctx, assetRoot, input, audio, settings, onLevelClear, isTouch = true, loadAssets = loadImages } = host;

  await loadAssets(IMAGES, assetRoot);

  const game = new Game({ input, audio, settings, onLevelClear, isTouch });
  const { scale, viewWidth } = computeViewport(ctx.canvas.width, ctx.canvas.height);
  const viewport = Object.freeze({ scale, viewWidth });
  game.setViewport(viewport);

  let accumulator = 0;
  let destroyed = false;

  return {
    game,
    viewport,

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

    render() {
      if (!destroyed) game.render(ctx);
    },

    /** The player walked away from the TV: the run in progress is simply dropped. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      input.reset();
      audio.stopMusic();
    }
  };
}
