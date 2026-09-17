import { Sprite } from '../core/sprite.js';

const tile = (x, y, size = [16, 16]) => new Sprite('tiles', [x, y], size);

/**
 * Every sprite a level is built from. Still tiles are shared by all the tiles
 * that use them; animated ones that must stay in sync (question blocks) are
 * listed in `animated` and advanced once per step by the level.
 */
export function createTheme(kind) {
  const isUnderground = kind === 'underground';
  const questionBlock = new Sprite('tiles', [384, 0], [16, 16], 8, [0, 0, 0, 0, 1, 2, 1]);

  return {
    floor: isUnderground ? tile(0, 32) : tile(0, 0),
    wall: isUnderground ? tile(32, 32) : tile(0, 16),
    brick: tile(16, 0),
    brickBounce: tile(32, 0),
    usedBlock: tile(48, 0),
    questionBlock,
    animated: [questionBlock],

    pipeLeftEnd: tile(0, 128),
    pipeRightEnd: tile(16, 128),
    pipeLeftMid: tile(0, 144),
    pipeRightMid: tile(16, 144),
    pipeUpMid: tile(0, 144, [32, 16]),
    pipeSideMid: tile(48, 128, [16, 32]),
    pipeLeft: tile(32, 128, [16, 32]),
    pipeTop: tile(0, 128, [32, 16]),

    cloud: tile(0, 320, [48, 32]),
    clouds: [tile(0, 320, [16, 32]), tile(16, 320, [16, 32]), tile(32, 320, [16, 32])],
    hills: [tile(128, 128), tile(144, 128), tile(160, 128), tile(128, 144), tile(144, 144), tile(160, 144)],
    bush: tile(176, 144, [48, 16]),
    bushes: [tile(176, 144), tile(192, 144), tile(208, 144)],
    flagpole: [tile(256, 128), tile(256, 144)],
    flag: new Sprite('items', [128, 32], [16, 16]),

    // These animate on their own clock, so everyone gets a fresh sprite.
    rubble: () => new Sprite('items', [64, 0], [8, 8], 3, [0, 1]),
    coin: () => new Sprite('items', [0, 96], [16, 16], 6, [0, 0, 0, 0, 1, 2, 1]),
    blockCoin: () => new Sprite('items', [0, 112], [16, 16], 20, [0, 1, 2, 3]),
    superMushroom: () => new Sprite('items', [0, 0], [16, 16]),
    fireFlower: () => new Sprite('items', [0, 32], [16, 16], 20, [0, 1, 2, 3]),
    star: () => new Sprite('items', [0, 48], [16, 16], 20, [0, 1, 2, 3]),
    goomba: () => new Sprite('enemy', [0, 16], [16, 16], 3, [0, 1]),
    koopa: () => new Sprite('enemy', [96, 0], [16, 32], 2, [0, 1])
  };
}
