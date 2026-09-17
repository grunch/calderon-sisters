import { Entity } from './entity.js';
import { world } from './world.js';
import { TILE } from '../config.js';
import { overlaps } from '../core/collision.js';

const WALK_SPEED = 0.5;
const ENEMY_GRAVITY = 0.2;
const SHELL_SPEED = 4;
const SHELL_WAKE_FRAMES = 360;
const STOMP_SCORE = 100;
const KICK_SCORE = 400;

class Enemy extends Entity {
  constructor(options) {
    super(options);
    this.dying = 0;
    this.flipping = false; // knocked upside down, falling off the screen
    this.vel[0] = -WALK_SPEED;
  }

  /** Shared bookkeeping. Returns false when there's nothing left to simulate. */
  wakeAndAge() {
    if (this.isAsleep()) return false;
    if (this.isBehindCamera()) this.dead = true;
    if (this.dying) {
      this.dying -= 1;
      if (!this.dying) this.dead = true;
    }
    return true;
  }

  fall(dt) {
    this.acc[1] = ENEMY_GRAVITY;
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.sprite.update(dt);
  }

  collideWithOthers() {
    for (const enemy of world.level.enemies) {
      if (enemy === this || enemy.dead || enemy.isAsleep()) continue;
      this.collideWith(enemy);
    }
    this.collideWith(world.player);
  }

  canTouch(entity) {
    if (entity.isPlayer && (this.dying || entity.invincibility)) return false;
    return overlaps(this, entity);
  }
}

export class Goomba extends Enemy {
  constructor(pos, sprite) {
    super({ pos, sprite, hitbox: [0, 0, TILE, TILE] });
    this.isGoomba = true;
  }

  update(dt) {
    if (!this.wakeAndAge()) return;
    this.fall(dt);
  }

  collideWall() {
    this.vel[0] = -this.vel[0];
  }

  checkCollisions() {
    if (this.flipping) {
      if (world.level.isBelowFloor(this, 1)) this.dead = true;
      return;
    }
    const rows = this.pos[1] % TILE === 0 ? 1 : 2;
    const columns = this.pos[0] % TILE === 0 ? 1 : 2;
    if (world.level.isBelowFloor(this, rows)) {
      this.dead = true;
      return;
    }
    world.level.collideTiles(this, columns, rows);
    this.collideWithOthers();
  }

  collideWith(entity) {
    if (!this.canTouch(entity)) return;
    if (!entity.isPlayer) {
      this.collideWall();
    } else if (entity.vel[1] > 0) {
      this.stomp();
    } else if (entity.starTime) {
      this.bump();
    } else {
      entity.damage();
    }
  }

  stomp() {
    world.audio.play('stomp');
    world.game.addScore(STOMP_SCORE);
    world.player.bounce = true;
    this.sprite.pos[0] = 32; // squashed
    this.sprite.speed = 0;
    this.vel[0] = 0;
    this.dying = 10;
  }

  bump() {
    if (this.flipping) return;
    world.audio.play('kick');
    world.game.addScore(STOMP_SCORE);
    this.sprite.img = 'enemyr';
    this.flipping = true;
    this.pos[1] -= 1;
    this.vel[0] = 0;
    this.vel[1] = -2.5;
  }
}

export class Koopa extends Enemy {
  constructor(pos, sprite) {
    // The real hitbox doesn't reach the ground, but it is what keeps us on the
    // floor, so an accurate one would make koopas sink into it.
    super({ pos, sprite, hitbox: [2, 8, 12, 24] });
    this.shell = 0;
    this.turn = false;
  }

  update(dt) {
    if (this.turn) {
      this.vel[0] = -this.vel[0];
      if (this.shell) world.audio.play('bump');
      this.turn = false;
    }
    if (this.vel[0] !== 0) this.left = this.vel[0] < 0;
    this.sprite.img = this.left ? 'enemy' : 'enemyr';

    if (!this.wakeAndAge()) return;
    if (this.shell) this.updateShell();
    this.fall(dt);
  }

  updateShell() {
    if (this.vel[0] !== 0) { // sliding shells never wake up
      this.shell = SHELL_WAKE_FRAMES;
      this.sprite.speed = 0;
      this.sprite.setFrame(0);
      return;
    }
    this.shell -= 1;
    if (this.shell < 120) this.sprite.speed = 5; // legs wiggle: about to come out
    if (this.shell === 0) {
      this.sprite = world.level.theme.koopa();
      this.hitbox = [2, 8, 12, 24];
      this.vel[0] = this.left ? WALK_SPEED : -WALK_SPEED;
      this.left = !this.left;
      this.pos[1] -= TILE;
    }
  }

  collideWall() {
    // Flip on the next update, or touching two wall tiles at once would flip twice.
    this.turn = true;
  }

  checkCollisions() {
    const rows = (this.shell ? 1 : 2) + (this.pos[1] % TILE !== 0 ? 1 : 0);
    const columns = this.pos[0] % TILE === 0 ? 1 : 2;
    if (world.level.isBelowFloor(this, rows)) {
      this.dead = true;
      return;
    }
    if (this.flipping) return;
    world.level.collideTiles(this, columns, rows);
    this.collideWithOthers();
  }

  collideWith(entity) {
    if (!this.canTouch(entity)) return;
    if (!entity.isPlayer) {
      if (this.shell && entity.isGoomba) entity.bump();
      else this.collideWall();
      return;
    }

    if (entity.vel[1] > 0) entity.bounce = true;
    if (this.shell) {
      world.audio.play('kick');
      if (this.vel[0] === 0) {
        world.game.addScore(KICK_SCORE);
        this.vel[0] = entity.left ? -SHELL_SPEED : SHELL_SPEED;
      } else if (entity.bounce) {
        this.vel[0] = 0;
      } else {
        entity.damage();
      }
    } else if (entity.vel[1] > 0) {
      this.stomp();
    } else {
      entity.damage();
    }
  }

  stomp() {
    world.audio.play('stomp');
    world.game.addScore(STOMP_SCORE);
    world.player.bounce = true;
    this.shell = SHELL_WAKE_FRAMES;
    this.sprite.pos[0] += 64;
    this.sprite.pos[1] += 16;
    this.sprite.size = [TILE, TILE];
    this.sprite.speed = 0;
    this.hitbox = [2, 0, 12, 16];
    this.vel = [0, 0];
    this.pos[1] += TILE;
  }

  bump() {
    if (this.flipping) return;
    world.audio.play('kick');
    world.game.addScore(STOMP_SCORE);
    this.flipping = true;
    this.sprite.pos = [160, 0];
    this.sprite.size = [TILE, TILE];
    this.sprite.speed = 0;
    this.hitbox = [2, 0, 12, 16];
    this.vel[0] = 0;
    this.vel[1] = -2.5;
  }
}
