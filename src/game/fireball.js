import { Entity } from './entity.js';
import { world } from './world.js';
import { Sprite } from '../core/sprite.js';
import { overlaps } from '../core/collision.js';

const SPEED = 5;
const GRAVITY = 0.5;
const BOUNCE = -4;
const EXPLOSION_FRAMES = 5;

export class Fireball extends Entity {
  constructor(pos) {
    super({ pos, sprite: new Sprite('items', [96, 144], [8, 8], 5, [0, 1, 2, 3]), hitbox: [0, 0, 8, 8] });
    this.hit = 0; // counts frames of the explosion once it touched something
    this.standing = false;
  }

  spawn(left) {
    world.audio.play('fireball');
    world.fireballs.push(this);
    this.vel = [left ? -SPEED : SPEED, 0];
  }

  remove() {
    this.dead = true;
    world.player.fireballs -= 1;
  }

  update(dt) {
    if (this.hit === 1) {
      this.sprite = new Sprite('items', [96, 160], [16, 16], 8, [0, 1, 2]);
      this.hit += 1;
      return;
    }
    if (this.hit === EXPLOSION_FRAMES) {
      this.remove();
      return;
    }
    if (this.hit) {
      this.hit += 1;
      return;
    }

    if (this.standing) { // bounce along the ground
      this.standing = false;
      this.vel[1] = BOUNCE;
    }
    this.vel[1] += GRAVITY;
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    const screenX = this.pos[0] - world.camera.x;
    if (screenX < 0 || screenX > world.viewWidth) this.hit = 1;
    this.sprite.update(dt);
  }

  collideWall() {
    if (!this.hit) this.hit = 1;
  }

  checkCollisions() {
    if (this.hit) return;
    const rows = this.pos[1] % 16 < 8 ? 1 : 2;
    const columns = this.pos[0] % 16 < 8 ? 1 : 2;
    if (world.level.isBelowFloor(this, rows)) {
      this.remove();
      return;
    }
    world.level.collideTiles(this, columns, rows);

    for (const enemy of world.level.enemies) {
      if (enemy.dead || enemy.flipping || enemy.isAsleep()) continue;
      if (overlaps(this, enemy)) {
        this.hit = 1;
        enemy.bump();
      }
    }
  }
}
