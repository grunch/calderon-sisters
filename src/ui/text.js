const FONT_STACK = 'ui-monospace, "Cascadia Mono", Menlo, Consolas, "Courier New", monospace';

/** Text with a hard 1px shadow so it reads over any background. */
export function drawText(ctx, text, x, y, { size = 8, color = '#fff', align = 'center' } = {}) {
  ctx.font = `bold ${size}px ${FONT_STACK}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
