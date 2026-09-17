import { world } from './world.js';
import { Player } from './player.js';
import { buildLevel, FIRST_LEVEL } from './levels/index.js';
import { CHARACTERS, characterById } from './characters.js';
import { createSession, addScore, addCoin, loseLife, tickClock } from './session.js';
import { initialSelection, stepSelection } from '../ui/select-logic.js';
import { SelectScreen, drawPauseScreen, drawGameOverScreen, drawClearScreen } from '../ui/screens.js';
import { drawHud } from '../ui/hud.js';
import { localSettings } from '../core/storage.js';
import { TILE, ROWS, VIEW_HEIGHT, MIN_VIEW_WIDTH } from '../config.js';

const STATE = { SELECT: 'select', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'gameover', CLEAR: 'clear' };
const TIME_BONUS_PER_TICK = 50;
const CLEAR_SCREEN_DELAY = 1.5; // seconds
// The camera starts following once the player is this far into the screen
// (80px on the classic 256px wide view).
const FOLLOW_RATIO = 80 / MIN_VIEW_WIDTH;
const EXIT_FOLLOW_EXTRA = 16;
const SCENERY_MARGIN_TILES = 3; // clouds and bushes are up to 3 tiles wide

// A touch screen gets the hint that talks about the on-screen buttons.
function detectTouch() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

export class Game {
  /**
   * `settings`, `onLevelClear` and `isTouch` are for a host that embeds the
   * game (see embed.js); on its own page the defaults are what it always did.
   */
  constructor({ input, audio, settings = localSettings, onLevelClear = () => {}, isTouch = detectTouch() }) {
    this.input = input;
    this.audio = audio;
    this.settings = settings;
    this.onLevelClear = onLevelClear;
    this.state = STATE.SELECT;
    this.session = null;
    this.player = null;
    this.timers = [];
    this.scale = 1;
    this.highScore = settings.load('highScore', 0);
    this.selectScreen = new SelectScreen();
    this.isTouch = isTouch;

    const savedIndex = CHARACTERS.indexOf(characterById(settings.load('character', CHARACTERS[0].id)));
    this.selection = initialSelection(savedIndex);

    world.input = input;
    world.audio = audio;
    world.game = this;
    audio.setMuted(settings.load('muted', false));
    this.showSelect();
  }

  get level() {
    return world.level;
  }

  get character() {
    return CHARACTERS[this.selection.index];
  }

  // ---- hooks the entities call --------------------------------------------

  addScore(points) {
    if (this.session) this.session = addScore(this.session, points);
  }

  addCoin() {
    if (this.session) this.session = addCoin(this.session);
  }

  /** Runs `callback` after `seconds` of game time (so it respects pause). */
  after(seconds, callback) {
    this.timers.push({ remaining: seconds, callback });
  }

  playerDied() {
    this.session = loseLife(this.session);
    if (this.session.lives === 0) {
      this.finish(STATE.GAME_OVER);
    } else {
      this.startLevel();
    }
  }

  levelCleared() {
    this.addScore(this.session.time * TIME_BONUS_PER_TICK);
    // A moment to see her walk into the castle before the results cover it.
    this.after(CLEAR_SCREEN_DELAY, () => {
      this.finish(STATE.CLEAR);
      this.onLevelClear();
    });
  }

  loadLevel(name, { silent = false } = {}) {
    const level = buildLevel(name, this);
    world.level = level;
    world.fireballs = [];
    this.player.fireballs = 0;
    this.player.pos = [...level.playerPos];
    this.placeCamera({ reset: true });
    if (!silent) this.audio.playMusic(level.music, { restart: level.restartMusic });
  }

  // ---- state changes ------------------------------------------------------------

  showSelect() {
    this.state = STATE.SELECT;
    this.input.clearPresses();
    this.session = null;
    this.timers = [];
    this.audio.stopMusic();
    this.spawnPlayer();
    this.loadLevel(FIRST_LEVEL, { silent: true });
  }

  startLevel() {
    this.timers = [];
    this.spawnPlayer();
    this.loadLevel(FIRST_LEVEL, { silent: true });
    this.audio.playMusic(world.level.music, { restart: true });
  }

  spawnPlayer() {
    this.player = new Player([0, 0], this.character);
    world.player = this.player;
  }

  finish(state) {
    this.state = state;
    this.input.clearPresses(); // jumps made while playing must not dismiss the screen
    if (this.session.score > this.highScore) {
      this.highScore = this.session.score;
      this.settings.save('highScore', this.highScore);
    }
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.input.clearPresses();
    this.audio.pauseAll();
  }

  resume() {
    this.state = STATE.PLAYING;
    this.input.clearPresses();
    this.audio.resumeAll();
  }

  toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.settings.save('muted', this.audio.muted);
  }

  // ---- view -----------------------------------------------------------------------

  setViewport({ scale, viewWidth }) {
    this.scale = scale;
    world.viewWidth = viewWidth;
    if (world.level) this.placeCamera();
  }

  /** Centers one-screen levels; keeps scrolling ones inside the level. */
  placeCamera({ reset = false } = {}) {
    const level = world.level;
    const levelWidth = level.width * TILE;
    if (!level.scrolling) {
      world.camera.x = Math.round((levelWidth - world.viewWidth) / 2);
      return;
    }
    const maxX = Math.max(0, levelWidth - world.viewWidth);
    world.camera.x = reset ? 0 : Math.min(Math.max(0, world.camera.x), maxX);
    this.followPlayer();
  }

  followPlayer() {
    const level = world.level;
    if (!level.scrolling) return;
    const followX = Math.round(world.viewWidth * FOLLOW_RATIO) + (this.player.exiting ? EXIT_FOLLOW_EXTRA : 0);
    const maxX = Math.max(0, level.width * TILE - world.viewWidth);
    if (this.player.pos[0] > world.camera.x + followX) {
      world.camera.x = Math.min(this.player.pos[0] - followX, maxX); // never scrolls back
    }
  }

  visibleColumns(margin) {
    const first = Math.floor(world.camera.x / TILE) - margin;
    return { first: Math.max(0, first), last: Math.floor((world.camera.x + world.viewWidth) / TILE) + margin };
  }

  // ---- update -------------------------------------------------------------------

  update(dt) {
    if (this.input.consumePress('MUTE')) this.toggleMute();

    switch (this.state) {
      case STATE.SELECT: this.updateSelect(dt); break;
      case STATE.PLAYING: this.updatePlaying(dt); break;
      case STATE.PAUSED:
        if (this.input.consumePress('PAUSE') || this.confirmPressed()) this.resume();
        break;
      default: // game over / level clear
        this.runTimers(dt);
        if (this.confirmPressed()) this.showSelect();
    }
  }

  confirmPressed() {
    const confirm = this.input.consumePress('CONFIRM');
    const jump = this.input.consumePress('JUMP');
    return confirm || jump;
  }

  /** A key counts if it is down now or was tapped since the last look. */
  isActive(action) {
    const wasTapped = this.input.consumePress(action);
    return wasTapped || this.input.isDown(action);
  }

  updateSelect(dt) {
    const confirm = this.isActive('CONFIRM');
    const jump = this.isActive('JUMP');
    const keys = { LEFT: this.isActive('LEFT'), RIGHT: this.isActive('RIGHT'), CONFIRM: confirm || jump };
    this.selection = stepSelection(this.selection, keys, CHARACTERS.length);

    this.player.character = this.character; // the player standing in the level changes too
    this.player.setAnimation();
    this.selectScreen.update(dt, this.selection.index);
    world.level.updateAnimatedTiles(dt);

    if (this.selection.confirmed) {
      this.settings.save('character', this.character.id);
      this.session = createSession(this.character.id);
      this.state = STATE.PLAYING;
      this.input.reset(); // the key that confirmed shouldn't also make her jump
      this.audio.playMusic(world.level.music, { restart: true });
    }
  }

  updatePlaying(dt) {
    if (this.input.consumePress('PAUSE')) {
      this.pause();
      return;
    }
    this.runTimers(dt);
    this.handleInput();
    this.updateEntities(dt);
    this.checkCollisions();
    this.updateClock(dt);
    world.level.sweep();
    world.fireballs = world.fireballs.filter((fireball) => !fireball.dead);
  }

  runTimers(dt) {
    const due = [];
    this.timers = this.timers
      .map((timer) => ({ ...timer, remaining: timer.remaining - dt }))
      .filter((timer) => {
        if (timer.remaining <= 0) due.push(timer);
        return timer.remaining > 0;
      });
    due.forEach((timer) => timer.callback());
  }

  handleInput() {
    const { player, input } = this;
    if (player.piping || player.dying || player.noInput) return;

    if (input.isDown('RUN')) player.run(); else player.noRun();
    if (input.isDown('JUMP')) player.jump(); else player.noJump();
    if (input.isDown('DOWN')) player.crouch(); else player.noCrouch();

    if (input.isDown('LEFT')) player.moveLeft();
    else if (input.isDown('RIGHT')) player.moveRight();
    else player.noWalk();
  }

  isWorldFrozen() {
    return this.player.powering.length !== 0 || Boolean(this.player.dying);
  }

  updateEntities(dt) {
    this.player.update(dt);
    const level = world.level; // read after the player: a pipe may have just loaded another level
    const { first, last } = this.visibleColumns(2);
    level.updateBlocks(first, last);
    level.updateAnimatedTiles(dt);
    this.followPlayer();

    if (this.isWorldFrozen()) return; // everything waits while she grows or dies
    for (const item of level.items) item.update(dt);
    for (const enemy of level.enemies) enemy.update(dt);
    for (const fireball of world.fireballs) fireball.update(dt);
    for (const pipe of level.pipes) pipe.update(dt);
  }

  checkCollisions() {
    if (this.isWorldFrozen()) return;
    const level = world.level; // a pipe may swap world.level mid-step; finish this one
    this.player.checkCollisions();
    for (const item of level.items) if (!item.dead) item.checkCollisions();
    for (const enemy of level.enemies) if (!enemy.dead) enemy.checkCollisions();
    for (const fireball of world.fireballs) if (!fireball.dead) fireball.checkCollisions();
    for (const pipe of level.pipes) pipe.checkCollisions();
  }

  updateClock(dt) {
    const player = this.player;
    if (player.dying || player.flagging || player.exiting || player.powering.length !== 0) return;
    this.session = tickClock(this.session, dt);
    if (this.session.time === 0) player.die();
  }

  // ---- render ---------------------------------------------------------------------

  render(ctx) {
    const viewWidth = world.viewWidth;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'high';
    this.renderWorld(ctx, viewWidth);

    if (this.session) drawHud(ctx, viewWidth, this.session, this.character.name);
    switch (this.state) {
      case STATE.SELECT: this.selectScreen.render(ctx, viewWidth, this.selection.index, this.highScore, this.isTouch); break;
      case STATE.PAUSED: drawPauseScreen(ctx, viewWidth, this.audio.muted); break;
      case STATE.GAME_OVER: drawGameOverScreen(ctx, viewWidth, this.session, this.highScore); break;
      case STATE.CLEAR: drawClearScreen(ctx, viewWidth, this.session, this.highScore); break;
      default:
    }
  }

  renderWorld(ctx, viewWidth) {
    const level = world.level;
    const cameraX = Math.round(world.camera.x);
    const draw = (entity) => entity.render(ctx, cameraX, 0);

    ctx.fillStyle = level.background;
    ctx.fillRect(0, 0, viewWidth, VIEW_HEIGHT);

    // Scenery goes first to get the layering right.
    const scenery = this.visibleColumns(SCENERY_MARGIN_TILES);
    for (let row = 0; row < ROWS; row++) {
      for (let column = scenery.first; column <= scenery.last; column++) {
        level.scenery[row][column]?.render(ctx, cameraX, 0);
      }
    }
    level.backdrops.forEach(draw);
    level.items.forEach(draw);
    level.enemies.forEach(draw);
    world.fireballs.forEach(draw);

    const tiles = this.visibleColumns(1);
    for (let row = 0; row < ROWS; row++) {
      for (let column = tiles.first; column <= tiles.last; column++) {
        level.statics[row][column]?.render(ctx, cameraX, 0);
        level.blocks[row][column]?.render(ctx, cameraX, 0);
      }
    }

    if (this.player.invincibility % 2 === 0) draw(this.player); // blinks while hurt
    level.pipes.forEach(draw); // the player goes INTO pipes, so they're drawn after
  }
}
