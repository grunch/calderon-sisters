import { world } from './world.js';
import { VIEW_HEIGHT } from '../config.js';

const PIECES = [
  { offset: [0, 0], vel: [-1.25, -5] },
  { offset: [8, 0], vel: [1.25, -5] },
  { offset: [0, 8], vel: [-1.25, -3] },
  { offset: [8, 8], vel: [1.25, -3] }
];
const GRAVITY = 0.3;

/** The four pieces a brick breaks into. */
export class Rubble {
  constructor() {
    this.pieces = [];
    this.dead = false;
  }

  spawn(pos) {
    this.pieces = PIECES.map(({ offset, vel }) => ({
      pos: [pos[0] + offset[0], pos[1] + offset[1]],
      vel: [...vel],
      sprite: world.level.theme.rubble()
    }));
    world.level.items.push(this);
  }

  update(dt) {
    for (const piece of this.pieces) {
      piece.vel[1] += GRAVITY;
      piece.pos[0] += piece.vel[0];
      piece.pos[1] += piece.vel[1];
      piece.sprite.update(dt);
    }
    this.pieces = this.pieces.filter((piece) => piece.pos[1] <= VIEW_HEIGHT + 16);
    if (this.pieces.length === 0) this.dead = true;
  }

  checkCollisions() {}

  render(ctx, cameraX, cameraY) {
    for (const piece of this.pieces) {
      piece.sprite.render(ctx, piece.pos[0], piece.pos[1], cameraX, cameraY);
    }
  }
}
