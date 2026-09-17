import { drawText } from './text.js';
import { padNumber } from './hud-format.js';
import { VIEW_HEIGHT } from '../config.js';
import { Sprite } from '../core/sprite.js';
import { CHARACTERS, RUN_FRAMES } from '../game/characters.js';

const GOLD = '#fcc400';
const MUTED_TEXT = '#b8b8b8';
const CARD = { width: 76, height: 100, top: 84, gap: 20, radius: 6 };
const PREVIEW_SCALE = 2;
const KEYBOARD_HINT = '← → ELEGIR   ENTER JUGAR   F PANTALLA COMPLETA';
const TOUCH_HINT = '\u25C0 \u25B6 ELEGIR   A JUGAR';

function dim(ctx, viewWidth, alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, viewWidth, VIEW_HEIGHT);
}

/** The character select screen, drawn over the start of the level. */
export class SelectScreen {
  #previews = CHARACTERS.map((character) => ({
    running: new Sprite(character.right, [96, 0], [16, 32], 12, RUN_FRAMES),
    standing: new Sprite(character.right, [80, 0], [16, 32])
  }));
  #time = 0;

  update(dt, selectedIndex) {
    this.#time += dt;
    this.#previews[selectedIndex].running.update(dt);
  }

  render(ctx, viewWidth, selectedIndex, highScore, isTouch) {
    const center = viewWidth / 2;
    dim(ctx, viewWidth, 0.4);
    drawText(ctx, 'CALDER\u00d3N SISTERS', center, 50, { size: 16, color: GOLD });
    drawText(ctx, 'ELIGE TU PERSONAJE', center, 70);

    const totalWidth = CHARACTERS.length * CARD.width + (CHARACTERS.length - 1) * CARD.gap;
    CHARACTERS.forEach((character, i) => {
      const left = center - totalWidth / 2 + i * (CARD.width + CARD.gap);
      this.#renderCard(ctx, character, this.#previews[i], left, i === selectedIndex);
    });

    drawText(ctx, isTouch ? TOUCH_HINT : KEYBOARD_HINT, center, 204, { size: 7, color: '#fce0a8' });
    if (highScore > 0) {
      drawText(ctx, `RÉCORD ${padNumber(highScore, 6)}`, center, 218, { size: 7 });
    }
  }

  #renderCard(ctx, character, preview, left, isSelected) {
    const cardCenter = left + CARD.width / 2;
    ctx.beginPath();
    ctx.roundRect(left, CARD.top, CARD.width, CARD.height, CARD.radius);
    ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.3)';
    ctx.fill();
    if (isSelected) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      const bob = Math.sin(this.#time * 6) * 2;
      drawText(ctx, '▼', cardCenter, CARD.top - 4 + bob, { color: GOLD });
    }

    ctx.save();
    ctx.globalAlpha = isSelected ? 1 : 0.45;
    ctx.translate(cardCenter, CARD.top + 10);
    ctx.scale(PREVIEW_SCALE, PREVIEW_SCALE);
    (isSelected ? preview.running : preview.standing).render(ctx, -8, 0);
    ctx.restore();

    drawText(ctx, character.name, cardCenter, CARD.top + CARD.height - 8,
      { size: 10, color: isSelected ? '#fff' : MUTED_TEXT });
  }
}

export function drawPauseScreen(ctx, viewWidth, isMuted) {
  const center = viewWidth / 2;
  dim(ctx, viewWidth, 0.55);
  drawText(ctx, 'PAUSA', center, 100, { size: 16, color: GOLD });
  drawText(ctx, 'P CONTINUAR', center, 126);
  drawText(ctx, `M SONIDO: ${isMuted ? 'NO' : 'SÍ'}`, center, 140);
  drawText(ctx, 'F PANTALLA COMPLETA', center, 154);
}

function drawResult(ctx, viewWidth, title, session, highScore) {
  const center = viewWidth / 2;
  dim(ctx, viewWidth, 0.6);
  drawText(ctx, title, center, 96, { size: 16, color: GOLD });
  drawText(ctx, `PUNTOS ${padNumber(session.score, 6)}`, center, 124);
  drawText(ctx, `RÉCORD ${padNumber(highScore, 6)}`, center, 138, { color: MUTED_TEXT });
  drawText(ctx, 'ENTER PARA VOLVER A JUGAR', center, 166, { size: 7, color: '#fce0a8' });
}

export function drawGameOverScreen(ctx, viewWidth, session, highScore) {
  drawResult(ctx, viewWidth, 'FIN DEL JUEGO', session, highScore);
}

export function drawClearScreen(ctx, viewWidth, session, highScore) {
  drawResult(ctx, viewWidth, '¡NIVEL COMPLETADO!', session, highScore);
}
