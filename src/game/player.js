import { Entity } from './entity.js';
import { world } from './world.js';
import { Sprite } from '../core/sprite.js';
import { Fireball } from './fireball.js';
import { RUN_FRAMES } from './characters.js';
import { TILE, VIEW_HEIGHT } from '../config.js';

// Physics are per 1/60s step, tuned to feel like the NES original.
const WALK_SPEED = 1.5;
const RUN_SPEED = 2.5;
const MOVE_ACCELERATION = 0.07;
const FRICTION = 0.05;
const GRAVITY = 0.25;
const JUMP_VELOCITY = -6;
const JUMP_HOLD_FRAMES = 20;
const MIN_JUMP_FRAMES = 16;
const STOMP_BOUNCE = -3;
const MAX_FIREBALLS = 2;
const STAR_FRAMES = 660;
const HURT_INVINCIBILITY_FRAMES = 120;
const POWERUP_SCORE = 1000;
const EXIT_WALK_SPEED = 1.5;

const POWER = { SMALL: 0, BIG: 1, FIRE: 2 };
// Sheet rows (y) of each form. Star palettes come from the level.
const SHEET_ROW = { [POWER.SMALL]: 32, [POWER.BIG]: 0, [POWER.FIRE]: 96 };
// Sheet columns (x).
const COLUMN = { STAND: 80, RUN: 96, SKID: 144, JUMP: 160, CROUCH: 176, CLIMB: 192, GROW: 320 };
const SHOOTING_OFFSET = 160;
const PAUSE = 5; // marker in the power-up animations: hold the current frame

export class Player extends Entity {
  constructor(pos, character) {
    super({
      pos,
      sprite: new Sprite(character.right, [COLUMN.STAND, SHEET_ROW[POWER.SMALL]], [TILE, TILE]),
      hitbox: [0, 0, TILE, TILE]
    });
    this.isPlayer = true;
    this.character = character;
    this.power = POWER.SMALL;
    this.powering = [];      // queued frames of the grow/shrink animation
    this.powerSprites = [];
    this.powerSizes = [];
    this.shift = [];
    this.maxSpeed = WALK_SPEED;
    this.moveAcc = MOVE_ACCELERATION;
    this.bounce = false;
    this.jumping = 0;
    this.canJump = true;
    this.invincibility = 0;
    this.starTime = 0;
    this.crouching = false;
    this.fireballs = 0;
    this.shooting = 0;
    this.runHeld = false;
    this.noInput = false;
    this.waiting = 0;        // seconds frozen in place
    this.dying = 0;          // seconds left of the death animation
    this.piping = false;
    this.pipeDestination = null;
    this.flagging = false;
    this.exiting = false;
    this.exited = false;
    this.targetPos = [];
  }

  // ---- input ---------------------------------------------------------------

  run() {
    this.maxSpeed = RUN_SPEED;
    if (this.power === POWER.FIRE && !this.runHeld) this.shoot();
    this.runHeld = true;
  }

  noRun() {
    this.maxSpeed = WALK_SPEED;
    this.moveAcc = MOVE_ACCELERATION;
    this.runHeld = false;
  }

  shoot() {
    if (this.fireballs >= MAX_FIREBALLS) return;
    this.fireballs += 1;
    new Fireball([this.pos[0] + 8, this.pos[1]]).spawn(this.left);
    this.shooting = 2;
  }

  move(direction) {
    const isOnGround = this.vel[1] === 0 && this.standing;
    if (isOnGround && this.crouching) {
      this.noWalk();
      return;
    }
    this.acc[0] = direction * this.moveAcc;
    if (isOnGround) this.left = direction < 0; // no turning around in mid-air
  }

  moveLeft() {
    this.move(-1);
  }

  moveRight() {
    this.move(1);
  }

  noWalk() {
    this.maxSpeed = 0;
    if (this.vel[0] !== 0 && Math.abs(this.vel[0]) <= 0.1) {
      this.vel[0] = 0;
      this.acc[0] = 0;
    }
  }

  crouch() {
    if (this.power === POWER.SMALL) {
      this.crouching = false;
    } else if (this.standing) {
      this.crouching = true;
    }
  }

  noCrouch() {
    this.crouching = false;
  }

  jump() {
    if (this.vel[1] > 0) return;
    if (this.jumping) {
      this.jumping -= 1; // holding the button keeps the jump going
    } else if (this.standing && this.canJump) {
      this.jumping = JUMP_HOLD_FRAMES;
      this.canJump = false;
      this.standing = false;
      this.vel[1] = JUMP_VELOCITY;
      world.audio.play(this.power === POWER.SMALL ? 'smallJump' : 'bigJump');
    }
  }

  noJump() {
    this.canJump = true;
    if (!this.jumping) return;
    if (this.jumping <= MIN_JUMP_FRAMES) {
      this.vel[1] = 0; // released early: cut the jump short
      this.jumping = 0;
    } else {
      this.jumping -= 1;
    }
  }

  // ---- animation -------------------------------------------------------------

  setAnimation() {
    if (this.dying) return;
    const sprite = this.sprite;

    if (this.starTime) this.cycleStarColors();

    if (this.crouching) {
      sprite.pos[0] = COLUMN.CROUCH;
      sprite.speed = 0;
    } else {
      if (this.jumping) {
        sprite.pos[0] = COLUMN.JUMP;
        sprite.speed = 0;
      } else if (this.standing) {
        this.setGroundAnimation();
      }
      if (this.flagging) {
        sprite.pos[0] = COLUMN.CLIMB;
        sprite.frames = this.vel[1] === 0 ? [0] : [0, 1];
        sprite.speed = 10;
      }
    }
    sprite.img = this.left ? this.character.left : this.character.right;
  }

  setGroundAnimation() {
    const sprite = this.sprite;
    const speed = Math.abs(this.vel[0]);
    if (speed > 0) {
      if (this.vel[0] * this.acc[0] >= 0) {
        sprite.pos[0] = COLUMN.RUN;
        sprite.frames = RUN_FRAMES;
        sprite.speed = speed < 0.2 ? 5 : speed * 8;
      } else if ((this.vel[0] > 0 && this.left) || (this.vel[0] < 0 && !this.left)) {
        sprite.pos[0] = COLUMN.SKID;
        sprite.speed = 0;
      }
    } else {
      sprite.pos[0] = COLUMN.STAND;
      sprite.speed = 0;
    }
    if (this.shooting) {
      sprite.pos[0] += SHOOTING_OFFSET;
      this.shooting -= 1;
    }
  }

  cycleStarColors() {
    const pace = this.starTime > 60 ? 2 : 8; // slows down when it's about to end
    const index = Math.floor(this.starTime / pace) % 3;
    this.sprite.pos[1] = world.level.starColors[index] + (this.power === POWER.SMALL ? 32 : 0);
    this.starTime -= 1;
    if (this.starTime === 0) this.sprite.pos[1] = SHEET_ROW[this.power];
  }

  // ---- simulation ----------------------------------------------------------

  update(dt) {
    if (this.powering.length !== 0) {
      this.advancePowerAnimation();
      return;
    }
    if (this.invincibility) this.invincibility -= 1;
    if (this.waiting) {
      this.waiting = Math.max(0, this.waiting - dt);
      if (this.waiting > 0) return;
    }
    if (this.bounce) {
      this.bounce = false;
      this.standing = false;
      this.vel[1] = STOMP_BOUNCE;
    }

    this.keepInsideLevel();
    if (Math.abs(this.vel[0]) > this.maxSpeed) {
      this.vel[0] -= FRICTION * Math.sign(this.vel[0]);
      this.acc[0] = 0;
    }

    if (this.dying) {
      this.updateDeath(dt);
    } else {
      this.acc[1] = GRAVITY;
      if (this.pos[1] > VIEW_HEIGHT) this.die(); // fell in a pit
    }
    if (this.piping) this.updatePiping();
    if (this.flagging) this.acc = [0, 0];
    if (this.exiting) this.updateExit();

    this.vel[0] += this.acc[0];
    this.vel[1] += this.acc[1];
    this.pos[0] += this.vel[0];
    this.pos[1] += this.vel[1];

    this.setAnimation();
    this.sprite.update(dt);
  }

  keepInsideLevel() {
    const leftEdge = Math.max(world.camera.x, 0); // the camera never scrolls back
    const rightEdge = world.level.width * TILE - TILE;
    if (this.pos[0] <= leftEdge) {
      this.pos[0] = leftEdge;
      this.vel[0] = Math.max(this.vel[0], 0);
    } else if (this.pos[0] >= rightEdge) {
      this.pos[0] = rightEdge;
      this.vel[0] = Math.min(this.vel[0], 0);
    }
  }

  advancePowerAnimation() {
    const next = this.powering.shift();
    if (next === PAUSE) return;
    this.sprite.pos = [...this.powerSprites[next]];
    this.sprite.size = this.powerSizes[next];
    this.pos[1] += this.shift[next];
  }

  updateDeath(dt) {
    if (this.pos[1] < this.targetPos[1]) this.vel[1] = 1; // top of the hop: fall
    this.dying -= dt;
    if (this.dying <= 0) {
      this.dying = Infinity; // report it once; the game replaces this player
      world.game.playerDied();
    }
  }

  updatePiping() {
    this.acc = [0, 0];
    const isThere = Math.round(this.pos[0]) === this.targetPos[0] &&
      Math.round(this.pos[1]) === this.targetPos[1];
    if (isThere) {
      this.piping = false;
      this.pipeDestination();
    }
  }

  updateExit() {
    this.left = false;
    this.flagging = false;
    this.vel[0] = EXIT_WALK_SPEED;
    if (this.pos[0] >= this.targetPos[0] && !this.exited) {
      this.exited = true;
      this.sprite.size = [0, 0]; // walked into the castle
      world.game.levelCleared();
    }
    if (this.exited) this.vel = [0, 0];
  }

  checkCollisions() {
    if (this.piping || this.dying) return;
    const rows = (this.power > POWER.SMALL ? 2 : 1) + (this.pos[1] % TILE !== 0 ? 1 : 0);
    const columns = this.pos[0] % TILE !== 0 ? 2 : 1;
    world.level.collideTiles(this, columns, rows);
  }

  // ---- things that happen to the player --------------------------------------

  powerUp(item) {
    item.dead = true;
    world.audio.play('powerup');
    world.game.addScore(POWERUP_SCORE);

    if (this.power === POWER.SMALL) {
      const row = this.sprite.pos[1] - 32;
      this.powering = [0, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 3, 5, 1, 5, 2, 5, 3, 5, 1, 5, 4];
      this.powerSprites = [[COLUMN.STAND, row + 32], [COLUMN.STAND, row + 32], [COLUMN.GROW, row], [COLUMN.STAND, row], [128, row]];
      this.powerSizes = [[16, 16], [16, 16], [16, 32], [16, 32], [16, 32]];
      this.shift = [0, 16, -16, 0, -16];
      this.power = POWER.BIG;
      this.hitbox = [0, 0, 16, 32];
    } else if (this.power === POWER.BIG) {
      const x = this.sprite.pos[0];
      const [first, second, third] = world.level.starColors;
      this.powering = [0, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 3, 5, 1, 5, 2, 5, 3, 5, 1, 5, 4];
      this.powerSprites = [[x, SHEET_ROW[POWER.FIRE]], [x, first], [x, second], [x, third], [x, SHEET_ROW[POWER.FIRE]]];
      this.powerSizes = [[16, 32], [16, 32], [16, 32], [16, 32], [16, 32]];
      this.shift = [0, 0, 0, 0, 0];
      this.power = POWER.FIRE;
    }
    // Already fiery: just the points.
  }

  damage() {
    if (this.power === POWER.SMALL) {
      this.die();
      return;
    }
    world.audio.play('pipe');
    this.powering = [0, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 1, 5, 2, 5, 3];
    this.shift = [0, 16, -16, 16];
    this.sprite.pos = [COLUMN.JUMP, 0];
    this.powerSprites = [[160, 0], [240, 32], [240, 0], [160, 32]];
    this.powerSizes = [[16, 32], [16, 16], [16, 32], [16, 16]];
    this.invincibility = HURT_INVINCIBILITY_FRAMES;
    this.power = POWER.SMALL;
    this.hitbox = [0, 0, 16, 16];
  }

  die() {
    if (this.dying) return;
    world.audio.stopMusic();
    world.audio.playMusic('death', { restart: true });
    this.noWalk();
    this.noRun();
    this.noJump();

    this.acc[0] = 0;
    this.sprite.pos = [COLUMN.CROUCH, SHEET_ROW[POWER.SMALL]]; // the small row has the death pose there
    this.sprite.size = [16, 16];
    this.sprite.speed = 0;
    this.power = POWER.SMALL;
    this.waiting = 0.5;
    this.dying = 2;

    if (this.pos[1] < VIEW_HEIGHT) { // falling into a pit doesn't do the hop
      this.targetPos = [this.pos[0], this.pos[1] - 128];
      this.vel = [0, -5];
    } else {
      this.vel = [0, 0];
      this.targetPos = [this.pos[0], this.pos[1] - 16];
    }
  }

  star(item) {
    item.dead = true;
    world.game.addScore(POWERUP_SCORE);
    this.starTime = STAR_FRAMES;
  }

  /** Slides into a pipe, then calls `destination`. */
  pipe(direction, destination) {
    const moves = { LEFT: [-1, 0], RIGHT: [1, 0], DOWN: [0, 1], UP: [0, -1] };
    const [dx, dy] = moves[direction];
    world.audio.play('pipe');
    this.piping = true;
    this.pipeDestination = destination;
    this.vel = [dx, dy];
    this.targetPos = [
      Math.round(this.pos[0] + dx * TILE),
      Math.round(this.pos[1] + dy * this.hitbox[3])
    ];
  }

  flag() {
    this.noInput = true;
    this.flagging = true;
    this.vel = [0, 2];
    this.acc = [0, 0];
  }

  /** The flag reached the bottom: hop off the pole and walk to the exit. */
  exit() {
    this.pos[0] += 16;
    this.targetPos[0] = world.level.exit * TILE;
    this.left = true;
    this.setAnimation();
    this.waiting = 1;
    this.exiting = true;
  }
}
