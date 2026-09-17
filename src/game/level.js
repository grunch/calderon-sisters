import { world } from './world.js';
import { TILE, ROWS } from '../config.js';
import { Floor, Block, Prop, Castle } from './terrain.js';
import { Goomba, Koopa } from './enemies.js';
import { Coin } from './items.js';
import { Pipe } from './pipe.js';
import { Flag } from './flag.js';

const emptyGrid = () => Array.from({ length: ROWS }, () => []);

export class Level {
  constructor({ theme, playerPos, scrolling, background, music, restartMusic = false, exit = 0, width, starColors }) {
    this.theme = theme;
    this.playerPos = playerPos;
    this.scrolling = scrolling;
    this.background = background;
    this.music = music;
    this.restartMusic = restartMusic; // start the tune over every time we enter
    this.exit = exit;             // tile column the player walks to after the flag
    this.width = width;           // in tiles
    this.starColors = starColors; // sheet rows of the star power palettes

    // Grids are [row][column]; columns are sparse.
    this.statics = emptyGrid();
    this.blocks = emptyGrid();
    this.scenery = emptyGrid();
    this.backdrops = []; // big scenery that doesn't fit the tile grid
    this.enemies = [];
    this.items = [];
    this.pipes = [];
  }

  // ---- simulation helpers ------------------------------------------------

  /** Collides an entity with the solid tiles under its `columns` x `rows` footprint. */
  collideTiles(entity, columns, rows) {
    const baseX = Math.floor(entity.pos[0] / TILE);
    const baseY = Math.floor(entity.pos[1] / TILE);
    for (let i = 0; i < rows; i++) {
      const row = baseY + i;
      if (row < 0 || row >= ROWS) continue;
      for (let j = 0; j < columns; j++) {
        this.statics[row][baseX + j]?.collideWith(entity);
        this.blocks[row][baseX + j]?.collideWith(entity);
      }
    }
  }

  /** True when the entity's footprint reaches past the bottom of the level (a pit). */
  isBelowFloor(entity, rows) {
    return Math.floor(entity.pos[1] / TILE) + rows > ROWS;
  }

  updateAnimatedTiles(dt) {
    for (const sprite of this.theme.animated) sprite.update(dt);
  }

  /** Blocks only need to move while they're near the screen. */
  updateBlocks(firstColumn, lastColumn) {
    for (const row of this.blocks) {
      for (let column = Math.max(0, firstColumn); column <= lastColumn; column++) {
        row[column]?.update();
      }
    }
  }

  sweep() {
    this.enemies = this.enemies.filter((entity) => !entity.dead);
    this.items = this.items.filter((entity) => !entity.dead);
  }

  // ---- builders ----------------------------------------------------------

  #prop(column, row, sprite) {
    this.scenery[row][column] = new Prop([column * TILE, row * TILE], sprite);
  }

  #solid(column, row, sprite) {
    this.statics[row][column] = new Floor([column * TILE, row * TILE], sprite);
  }

  putFloor(start, end) {
    for (let column = start; column < end; column++) {
      this.#solid(column, 13, this.theme.floor);
      this.#solid(column, 14, this.theme.floor);
    }
  }

  /** `bottom` is the row under the wall. */
  putWall(column, bottom, height) {
    for (let row = bottom - height; row < bottom; row++) {
      this.#solid(column, row, this.theme.wall);
    }
  }

  /** A decorative pipe made of solid tiles. */
  putPipe(column, bottom, height) {
    const { pipeLeftEnd, pipeRightEnd, pipeLeftMid, pipeRightMid } = this.theme;
    for (let row = bottom - height; row < bottom; row++) {
      const isTop = row === bottom - height;
      this.#solid(column, row, isTop ? pipeLeftEnd : pipeLeftMid);
      this.#solid(column + 1, row, isTop ? pipeRightEnd : pipeRightMid);
    }
  }

  /** A pipe that can take the player somewhere. */
  putRealPipe(column, row, length, direction, destination) {
    this.pipes.push(new Pipe({ pos: [column * TILE, row * TILE], length, direction, destination, theme: this.theme }));
  }

  putQBlock(column, row, item) {
    this.blocks[row][column] = new Block({
      pos: [column * TILE, row * TILE],
      sprite: this.theme.questionBlock,
      usedSprite: this.theme.usedBlock,
      item
    });
  }

  putBrick(column, row, item = null) {
    this.blocks[row][column] = new Block({
      pos: [column * TILE, row * TILE],
      sprite: this.theme.brick,
      bounceSprite: this.theme.brickBounce,
      usedSprite: this.theme.usedBlock,
      breakable: !item,
      item
    });
  }

  putCoin(column, row) {
    this.items.push(new Coin([column * TILE, row * TILE], this.theme.coin()));
  }

  putGoomba(column, row) {
    this.enemies.push(new Goomba([column * TILE, row * TILE], this.theme.goomba()));
  }

  putKoopa(column, row) {
    this.enemies.push(new Koopa([column * TILE, row * TILE], this.theme.koopa()));
  }

  putFlagpole(column) {
    this.#solid(column, 12, this.theme.wall);
    for (let row = 3; row < 12; row++) this.#prop(column, row, this.theme.flagpole[1]);
    this.#prop(column, 2, this.theme.flagpole[0]);
    this.items.push(new Flag(column * TILE));
  }

  /** The castle goes where the player walks to after the flag. */
  putCastle() {
    this.backdrops.push(new Castle(this.exit));
  }

  putCloud(column, row) {
    this.#prop(column, row, this.theme.cloud);
  }

  /** A cloud with `middles` repeated center pieces. */
  putLongCloud(column, row, middles) {
    const [left, middle, right] = this.theme.clouds;
    this.#prop(column, row, left);
    for (let i = 1; i <= middles; i++) this.#prop(column + i, row, middle);
    this.#prop(column + middles + 1, row, right);
  }

  putBush(column, row) {
    this.#prop(column, row, this.theme.bush);
  }

  putLongBush(column, row, middles) {
    const [left, middle, right] = this.theme.bushes;
    this.#prop(column, row, left);
    for (let i = 1; i <= middles; i++) this.#prop(column + i, row, middle);
    this.#prop(column + middles + 1, row, right);
  }

  putSmallHill(column, row) {
    const hills = this.theme.hills;
    this.#prop(column, row, hills[0]);
    this.#prop(column + 1, row, hills[3]);
    this.#prop(column + 1, row - 1, hills[1]);
    this.#prop(column + 2, row, hills[2]);
  }

  putBigHill(column, row) {
    const hills = this.theme.hills;
    this.#prop(column, row, hills[0]);
    this.#prop(column + 1, row, hills[3]);
    this.#prop(column + 1, row - 1, hills[0]);
    this.#prop(column + 2, row, hills[4]);
    this.#prop(column + 2, row - 1, hills[3]);
    this.#prop(column + 2, row - 2, hills[1]);
    this.#prop(column + 3, row, hills[5]);
    this.#prop(column + 3, row - 1, hills[2]);
    this.#prop(column + 4, row, hills[2]);
  }
}
