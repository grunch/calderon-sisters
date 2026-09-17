import { world } from './world.js';
import { TILE } from '../config.js';
import { collideSolid } from '../core/collision.js';

/**
 * A simple straight pipe. `direction` is the way you move INTO it; pipes with
 * a `destination` callback can be entered by holding that direction.
 */
export class Pipe {
  constructor({ pos, length, direction, theme, destination = null }) {
    this.pos = pos;
    this.length = length;
    this.direction = direction;
    this.destination = destination;
    this.vel = [0, 0];

    const isVertical = direction === 'UP' || direction === 'DOWN';
    this.hitbox = isVertical ? [0, 0, 32, length * TILE] : [0, 0, length * TILE, 32];
    this.midSection = isVertical ? theme.pipeUpMid : theme.pipeSideMid;
    this.endSection = isVertical ? theme.pipeTop : theme.pipeLeft;
  }

  isPlayerAtMouth(player) {
    const height = player.power === 0 ? 16 : 32;
    const x = Math.floor(player.pos[0]);
    const y = Math.floor(player.pos[1]);
    const [px, py] = this.pos;
    const insideRows = y >= py && y + height <= py + 32;
    const insideColumns = x >= px && x + 16 <= px + 32;

    switch (this.direction) {
      case 'RIGHT': return x === px - 16 && insideRows;
      case 'LEFT': return x === px + TILE * this.length && insideRows;
      case 'UP': return y === py + TILE * this.length && insideColumns;
      case 'DOWN': return y + height === py && insideColumns;
      default: return false;
    }
  }

  update() {
    if (!this.destination || !world.input.isDown(this.direction)) return;
    if (this.isPlayerAtMouth(world.player)) {
      world.player.pipe(this.direction, this.destination);
    }
  }

  checkCollisions() {
    const { level, player, fireballs } = world;
    for (const entity of [...level.enemies, ...level.items, ...fireballs]) {
      if (entity.hitbox && !entity.dead) collideSolid(this, entity);
    }
    if (!player.piping) collideSolid(this, player);
  }

  render(ctx, cameraX, cameraY) {
    const [x, y] = this.pos;
    const last = this.length - 1;
    for (let i = 0; i < this.length; i++) {
      const isEnd = (this.direction === 'DOWN' || this.direction === 'RIGHT') ? i === 0 : i === last;
      const section = isEnd ? this.endSection : this.midSection;
      const isVertical = this.direction === 'UP' || this.direction === 'DOWN';
      section.render(ctx, isVertical ? x : x + i * TILE, isVertical ? y + i * TILE : y, cameraX, cameraY);
    }
  }
}
