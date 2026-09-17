import { TILE } from '../config.js';

// Character sheets keep the 16px logical layout of the original player sheet,
// but every column is a hi-res cell drawn wider than the hitbox
// (see tools/build_character_sprites.py).
export const CHARACTER_SHEET = Object.freeze({
  cellWidth: 128,     // source pixels per 16px logical column
  pixelsPerUnit: 4,   // source pixels per logical pixel of height
  overhang: 8,        // logical pixels drawn past each side of the hitbox
  shortScale: 1.3     // how much bigger than its hitbox a 16px tall sprite is drawn
});

/** Where to read from a hi-res sheet and where to put it on the canvas. */
export function hiResRects(sheet, x, y, size, destX, destY) {
  const scale = size[1] <= TILE ? sheet.shortScale : 1;
  const width = Math.round((size[0] + 2 * sheet.overhang) * scale);
  const height = Math.round(size[1] * scale);
  const left = Math.round(destX);
  const top = Math.round(destY);

  return {
    source: [
      (x / TILE) * sheet.cellWidth,
      y * sheet.pixelsPerUnit,
      (size[0] / TILE) * sheet.cellWidth,
      size[1] * sheet.pixelsPerUnit
    ],
    // centered on the hitbox, standing on its floor
    dest: [left + size[0] / 2 - width / 2, top + size[1] - height, width, height]
  };
}
