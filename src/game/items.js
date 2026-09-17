import { Entity } from './entity.js';
import { world } from './world.js';
import { TILE } from '../config.js';
import { overlaps } from '../core/collision.js';

const RISE_FRAMES = 12;
const ITEM_GRAVITY = 0.2;

/** Anything that rises out of a block: mushroom, fire flower, star. */
class RisingItem extends Entity {
  constructor(pos, sprite, { walks }) {
    super({ pos, sprite, hitbox: [0, 0, TILE, TILE] });
    this.walks = walks;
    this.spawning = 0;
    this.waiting = 0;
    this.targetY = 0;
  }

  spawn() {
    world.audio.play('itemAppear');
    world.level.items.push(this);
    this.spawning = RISE_FRAMES;
    this.targetY = this.pos[1] - TILE;
  }

  render(ctx, cameraX, cameraY) {
    if (this.spawning > 1) return; // still inside the block
    super.render(ctx, cameraX, cameraY);
  }

  update(dt) {
    if (this.spawning > 1) {
      this.spawning -= 1;
      if (this.spawning === 1) this.vel[1] = -0.5;
      return;
    }
    if (this.spawning) {
      if (this.pos[1] <= this.targetY) {
        this.pos[1] = this.targetY;
        this.vel[1] = 0;
        this.spawning = 0;
        if (this.walks) {
          this.waiting = 5;
          this.vel[0] = 1;
        }
      }
    } else if (this.walks) {
      this.acc[1] = ITEM_GRAVITY;
    }
    this.beforeMove();

    if (this.waiting) {
      this.waiting -= 1;
      return;
    }
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];
    this.sprite.update(dt);
  }

  beforeMove() {}

  collideWall() {
    this.vel[0] = -this.vel[0];
  }

  checkCollisions() {
    if (this.spawning) return;
    if (this.walks) {
      const rows = this.pos[1] % TILE === 0 ? 1 : 2;
      const columns = this.pos[0] % TILE === 0 ? 1 : 2;
      if (world.level.isBelowFloor(this, rows)) {
        this.dead = true;
        return;
      }
      world.level.collideTiles(this, columns, rows);
    }
    if (overlaps(this, world.player)) this.collect(world.player);
  }

  bump() {
    if (this.walks) this.vel[1] = -2;
  }
}

export class Mushroom extends RisingItem {
  constructor(pos) {
    super(pos, world.level.theme.superMushroom(), { walks: true });
  }

  spawn() {
    if (world.player.power > 0) {
      new Fireflower(this.pos).spawn(); // big players get a flower instead
      return;
    }
    super.spawn();
  }

  collect(player) {
    player.powerUp(this);
  }
}

export class Fireflower extends RisingItem {
  constructor(pos) {
    super(pos, world.level.theme.fireFlower(), { walks: false });
  }

  collect(player) {
    player.powerUp(this);
  }
}

export class Star extends RisingItem {
  constructor(pos) {
    super(pos, world.level.theme.star(), { walks: true });
  }

  beforeMove() {
    if (this.standing) { // stars bounce along the ground
      this.standing = false;
      this.vel[1] = -3;
    }
  }

  collect(player) {
    player.star(this);
  }
}

/** A coin lying in the level. Money is not affected by gravity, you see. */
export class Coin extends Entity {
  constructor(pos, sprite) {
    super({ pos, sprite, hitbox: [0, 0, TILE, TILE] });
  }

  update(dt) {
    this.sprite.update(dt);
  }

  checkCollisions() {
    if (!overlaps(this, world.player)) return;
    world.audio.play('coin', 0.05);
    world.game.addCoin();
    this.dead = true;
  }
}

/** The coin that pops out of a block. */
export class BlockCoin extends Entity {
  constructor(pos) {
    super({ pos, sprite: world.level.theme.blockCoin(), hitbox: [0, 0, TILE, TILE] });
    this.speed = 0;
    this.targetY = 0;
  }

  spawn() {
    world.audio.play('coin', 0.05);
    world.level.items.push(this);
    this.speed = -12;
    this.targetY = this.pos[1] - 32;
  }

  update(dt) {
    if (this.speed > 0 && this.pos[1] >= this.targetY) {
      world.game.addCoin();
      this.dead = true;
      return;
    }
    this.speed += 0.75;
    this.pos[1] += this.speed;
    this.sprite.update(dt);
  }

  checkCollisions() {}
}

const BLOCK_ITEMS = { coin: BlockCoin, mushroom: Mushroom, star: Star };

export function createBlockItem(kind, pos) {
  const Item = BLOCK_ITEMS[kind];
  if (!Item) throw new Error(`Objeto de bloque desconocido: ${kind}`);
  return new Item(pos);
}
