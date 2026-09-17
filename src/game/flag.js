import { world } from './world.js';

const TOP_Y = 49;
const BOTTOM_Y = 170;
const SLIDE_SPEED = 2;
const CLEAR_MUSIC_DELAY = 2; // seconds

/** Points for grabbing the pole, by how high the player was. */
export function flagScore(playerY) {
  if (playerY < 60) return 5000;
  if (playerY < 100) return 2000;
  if (playerY < 140) return 800;
  return 400;
}

/** The flag at the end of the level. Flags always have the same height. */
export class Flag {
  constructor(x) {
    this.pos = [x, TOP_Y];
    this.vel = [0, 0];
    this.hit = false;
    this.done = false;
    this.dead = false;
  }

  update() {
    if (!this.done && this.pos[1] >= BOTTOM_Y) {
      this.vel = [0, 0];
      this.pos[1] = BOTTOM_Y;
      this.done = true;
      world.player.exit();
    }
    this.pos[1] += this.vel[1];
  }

  checkCollisions() {
    const { player, audio, game } = world;
    if (this.hit || player.pos[0] + 8 < this.pos[0]) return;

    this.hit = true;
    this.vel = [0, SLIDE_SPEED];
    game.addScore(flagScore(player.pos[1]));
    audio.stopMusic();
    audio.play('flagpole');
    game.after(CLEAR_MUSIC_DELAY, () => audio.playMusic('clear', { restart: true }));
    player.flag();
  }

  render(ctx, cameraX, cameraY) {
    world.level.theme.flag.render(ctx, this.pos[0] - 8, this.pos[1], cameraX, cameraY);
  }
}
