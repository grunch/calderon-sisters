import { Entity } from './entity.js';
import { world } from './world.js';
import { TILE } from '../config.js';
import { boxOf, boxesOverlap, collideSolid } from '../core/collision.js';
import { Rubble } from './rubble.js';
import { createBlockItem } from './items.js';
import { getImage } from '../core/assets.js';
import { CASTLE, castlePlacement } from './castle-placement.js';

const BRICK_SCORE = 50;

/** Scenery: drawn, never touched. */
export class Prop {
  constructor(pos, sprite) {
    this.pos = pos;
    this.sprite = sprite;
  }

  render(ctx, cameraX, cameraY) {
    this.sprite.render(ctx, this.pos[0], this.pos[1], cameraX, cameraY);
  }
}

/** The building at the end of the level. The player walks in through its door. */
export class Castle {
  constructor(exitColumn) {
    this.box = castlePlacement(exitColumn);
  }

  render(ctx, cameraX, cameraY) {
    const { x, y, width, height } = this.box;
    ctx.imageSmoothingEnabled = true; // hi-res art scaled down looks best smoothed
    ctx.drawImage(getImage(CASTLE.image), Math.round(x - cameraX), Math.round(y - cameraY), width, height);
    ctx.imageSmoothingEnabled = false;
  }
}

/** A solid 16x16 tile. */
export class Floor extends Entity {
  constructor(pos, sprite) {
    super({ pos, sprite, hitbox: [0, 0, TILE, TILE] });
  }

  collideWith(entity) {
    if (!boxesOverlap(boxOf(this, true), boxOf(entity, true))) return;

    if (!this.standing) {
      entity.bump(); // standing on a block while it gets hit from below
      return;
    }
    collideSolid(this, entity, {
      isCovered: () => Boolean(world.level.statics[this.pos[1] / TILE - 1]?.[this.pos[0] / TILE]),
      onBonk: (player) => this.bonk(player.power)
    });
  }

  bonk() {}
}

/** Bricks and question blocks: they bounce, break or give an item. */
export class Block extends Floor {
  constructor({ pos, sprite, usedSprite, bounceSprite = null, breakable = false, item = null }) {
    super(pos, sprite);
    this.usedSprite = usedSprite;
    this.bounceSprite = bounceSprite;
    this.breakable = breakable;
    this.item = item; // 'coin' | 'mushroom' | 'star' | null
    this.restPos = null;
    this.restSprite = null;
  }

  break() {
    world.audio.play('breakBlock');
    world.game.addScore(BRICK_SCORE);
    new Rubble().spawn(this.pos);
    delete world.level.blocks[this.pos[1] / TILE][this.pos[0] / TILE];
  }

  bonk(power) {
    world.audio.play('bump');
    if (power > 0 && this.breakable) {
      this.break();
      return;
    }
    if (!this.standing) return;

    this.standing = false;
    if (this.item) {
      createBlockItem(this.item, [this.pos[0], this.pos[1]]).spawn();
      this.item = null;
    }
    this.restPos = [this.pos[0], this.pos[1]];
    if (this.bounceSprite) {
      this.restSprite = this.sprite;
      this.sprite = this.bounceSprite;
    } else {
      this.sprite = this.usedSprite;
    }
    this.vel[1] = -2;
  }

  update() {
    if (!this.standing) {
      if (this.pos[1] < this.restPos[1] - 8) this.vel[1] = 2;
      if (this.pos[1] > this.restPos[1]) {
        this.vel[1] = 0;
        this.pos = this.restPos;
        if (this.restSprite) this.sprite = this.restSprite;
        this.standing = true;
      }
    } else if (this.sprite === this.usedSprite) {
      // A used block is just a plain solid tile from now on.
      const column = this.pos[0] / TILE;
      const row = this.pos[1] / TILE;
      world.level.statics[row][column] = new Floor(this.pos, this.usedSprite);
      delete world.level.blocks[row][column];
    }
    this.pos[1] += this.vel[1];
  }
}
