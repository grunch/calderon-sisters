import { Game } from './game/game.js';
import { Input } from './core/input.js';
import { AudioManager } from './core/audio.js';
import { loadImages } from './core/assets.js';
import { advance, STEP } from './core/timestep.js';
import { computeViewport } from './core/viewport.js';
import { IMAGES, SOUNDS, MUSIC } from './assets-manifest.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const message = document.getElementById('message');
const ctx = canvas.getContext('2d', { alpha: false });

function toggleFullscreen() {
  const isFullscreen = document.fullscreenElement ?? document.webkitFullscreenElement;
  if (isFullscreen) {
    (document.exitFullscreen ?? document.webkitExitFullscreen).call(document);
    return;
  }
  const request = stage.requestFullscreen ?? stage.webkitRequestFullscreen;
  if (!request) {
    showMessage('Este navegador no permite pantalla completa.');
    return;
  }
  Promise.resolve(request.call(stage)).catch((error) => {
    showMessage(`No se pudo entrar a pantalla completa: ${error.message}`);
  });
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
  window.setTimeout(() => { message.hidden = true; }, 4000);
}

function fitCanvas(game) {
  const view = computeViewport(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1);
  canvas.width = view.pixelWidth;
  canvas.height = view.pixelHeight;
  canvas.style.width = `${view.cssWidth}px`;
  canvas.style.height = `${view.cssHeight}px`;
  game.setViewport(view);
}

function start() {
  const input = new Input({ onFullscreen: toggleFullscreen });
  const audio = new AudioManager(SOUNDS, MUSIC);
  const game = new Game({ input, audio });

  input.bindTouchControls(document.getElementById('touch-controls'));
  // Buttons give focus back right away so Space/Enter keep belonging to the game.
  const onClick = (id, action) => {
    const button = document.getElementById(id);
    button.addEventListener('click', () => {
      action();
      button.blur();
    });
  };
  onClick('btn-fullscreen', toggleFullscreen);
  onClick('btn-pause', () => (game.state === 'paused' ? game.resume() : game.pause()));
  onClick('btn-mute', () => game.toggleMute());

  new ResizeObserver(() => fitCanvas(game)).observe(stage);
  fitCanvas(game);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.pause();
  });

  let lastTime = performance.now();
  let accumulator = 0;
  function frame(now) {
    const result = advance(accumulator, (now - lastTime) / 1000);
    accumulator = result.accumulator;
    lastTime = now;

    input.pollGamepads();
    for (let i = 0; i < result.steps; i++) game.update(STEP);
    game.render(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.game = game; // handy in the console
}

loadImages(IMAGES).then(start).catch((error) => {
  console.error(error);
  message.textContent = `${error.message}. Abre el juego desde un servidor web (mira el README).`;
  message.hidden = false;
});
