import { getImage } from './assets.js';
import { CHARACTER_SHEET, hiResRects } from './sprite-math.js';
import { characterImages } from '../game/characters.js';

const HI_RES_SHEETS = new Map(characterImages().map((key) => [key, CHARACTER_SHEET]));

export class Sprite {
  /**
   * @param {string} img     image key from the asset manifest
   * @param {number[]} pos   top-left of the first frame in the sheet
   * @param {number[]} size  [width, height] of one frame
   * @param {number} speed   frames per second, 0 for a still image
   * @param {number[]} frames column offsets of each animation frame
   */
  constructor(img, pos, size, speed = 0, frames = [0], once = false) {
    this.img = img;
    this.pos = pos;
    this.size = size;
    this.speed = speed;
    this.frames = frames;
    this.once = once;
    this.done = false;
    this.index = 0;
  }

  update(dt) {
    this.index += this.speed * dt;
  }

  setFrame(frame) {
    this.index = frame;
  }

  render(ctx, x, y, cameraX = 0, cameraY = 0) {
    if (this.size[0] === 0 || this.size[1] === 0) return; // hidden

    let frame = 0;
    if (this.speed > 0) {
      const step = Math.floor(this.index);
      if (this.once && step >= this.frames.length) {
        this.done = true;
        return;
      }
      frame = this.frames[step % this.frames.length];
    }

    const sourceX = this.pos[0] + frame * this.size[0];
    const sourceY = this.pos[1];
    const image = getImage(this.img);
    const sheet = HI_RES_SHEETS.get(this.img);

    if (sheet) {
      // Hi-res art is scaled down, which looks best smoothed.
      const rects = hiResRects(sheet, sourceX, sourceY, this.size, x - cameraX, y - cameraY);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(image, ...rects.source, ...rects.dest);
      ctx.imageSmoothingEnabled = false;
      return;
    }

    ctx.drawImage(image, sourceX, sourceY, this.size[0], this.size[1],
      Math.round(x - cameraX), Math.round(y - cameraY), this.size[0], this.size[1]);
  }
}
