import { drawText } from './text.js';
import { hudFields } from './hud-format.js';

const LABEL_Y = 14;
const VALUE_Y = 24;

export function drawHud(ctx, viewWidth, session, characterName) {
  const fields = hudFields(session, characterName);
  const slot = viewWidth / fields.length;
  fields.forEach((field, i) => {
    const x = slot * (i + 0.5);
    drawText(ctx, field.label, x, LABEL_Y, { size: 7, color: '#fce0a8' });
    drawText(ctx, field.value, x, VALUE_Y);
  });
}
