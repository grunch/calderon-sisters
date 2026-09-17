import { world } from './world.js';
import { ENEMY_WAKE_MARGIN } from '../config.js';

export class Entity {
  constructor({ pos, sprite, hitbox }) {
    this.pos = pos;
    this.sprite = sprite;
    this.hitbox = hitbox;
    this.vel = [0, 0];
    this.acc = [0, 0];
    this.standing = true;
    this.left = false;
    this.dead = false; // dead entities are swept out of the level after each step
  }

  render(ctx, cameraX, cameraY) {
    this.sprite.render(ctx, this.pos[0], this.pos[1], cameraX, cameraY);
  }

  /** The wall is always a 16x16 tile with hitbox [0,0,16,16]. */
  collideWall(wall) {
    if (this.pos[0] > wall.pos[0]) {
      this.pos[0] = wall.pos[0] + wall.hitbox[2] - this.hitbox[0];
      this.vel[0] = Math.max(0, this.vel[0]);
      this.acc[0] = Math.max(0, this.acc[0]);
    } else {
      this.pos[0] = wall.pos[0] + wall.hitbox[0] - this.hitbox[2] - this.hitbox[0];
      this.vel[0] = Math.min(0, this.vel[0]);
      this.acc[0] = Math.min(0, this.acc[0]);
    }
  }

  bump() {}

  /** Too far past the right edge of the screen to bother simulating. */
  isAsleep() {
    return this.pos[0] - world.camera.x > world.viewWidth + ENEMY_WAKE_MARGIN;
  }

  isBehindCamera() {
    return this.pos[0] - world.camera.x < -32;
  }
}
