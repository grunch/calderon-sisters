import { Level } from '../level.js';
import { createTheme } from '../theme.js';

const GROUND = [[0, 69], [71, 86], [89, 153], [155, 212]];
const CLOUDS = [[7, 3], [19, 2], [56, 3], [67, 2], [87, 2], [103, 2], [152, 3], [163, 2], [200, 3]];
const TWO_CLOUDS = [[36, 2], [132, 2], [180, 2]];
const THREE_CLOUDS = [[27, 3], [75, 3], [123, 3], [171, 3]];
const BIG_HILLS = [0, 48, 96, 144, 192];
const SMALL_HILLS = [16, 64, 111, 160];
const BUSHES = [23, 71, 118, 167];
const TWO_BUSHES = [41, 89, 137];
const THREE_BUSHES = [11, 59, 106];

// [column, row, item]
const QUESTION_BLOCKS = [
  [16, 9, 'coin'], [21, 9, 'mushroom'], [22, 5, 'coin'], [23, 9, 'coin'],
  [78, 9, 'mushroom'], [94, 5, 'coin'], [105, 9, 'coin'], [108, 9, 'coin'],
  [108, 5, 'mushroom'], [111, 9, 'coin'], [129, 5, 'coin'], [130, 5, 'coin'], [170, 9, 'coin']
];
const BRICKS = [
  [20, 9], [22, 9], [24, 9], [77, 9], [79, 9],
  [80, 5], [81, 5], [82, 5], [83, 5], [84, 5], [85, 5], [86, 5], [87, 5],
  [91, 5], [92, 5], [93, 5], [94, 9], [100, 9, 'star'], [101, 9], [117, 9],
  [120, 5], [121, 5], [122, 5], [123, 5], [128, 5], [129, 9], [130, 9], [131, 5],
  [168, 9], [169, 9], [171, 9]
];
// [column, height]
const TILE_PIPES = [[28, 2], [38, 3], [46, 4], [163, 2], [179, 2]];
const STAIRS = [
  [134, 1], [135, 2], [136, 3], [137, 4], [140, 4], [141, 3], [142, 2], [143, 1],
  [148, 1], [149, 2], [150, 3], [151, 4], [152, 4], [155, 4], [156, 3], [157, 2], [158, 1],
  [181, 1], [182, 2], [183, 3], [184, 4], [185, 5], [186, 6], [187, 7], [188, 8], [189, 8]
];
const GOOMBAS = [
  [22, 12], [40, 12], [50, 12], [51, 12], [82, 4], [84, 4], [100, 12], [102, 12],
  [114, 12], [115, 12], [122, 12], [123, 12], [125, 12], [126, 12], [170, 12], [172, 12]
];
const KOOPAS = [[35, 11]];
const GROUND_ROW = 13;
const SCENERY_ROW = 12;

/** World 1-1. `game` provides loadLevel for the pipe to the bonus room. */
export function buildLevel11(game) {
  const level = new Level({
    theme: createTheme('overworld'),
    playerPos: [56, 192],
    scrolling: true,
    background: '#7974FF',
    music: 'overworld',
    exit: 204,
    width: 212,
    starColors: [144, 192, 240]
  });

  GROUND.forEach(([start, end]) => level.putFloor(start, end));

  CLOUDS.forEach(([x, y]) => level.putCloud(x, y));
  TWO_CLOUDS.forEach(([x, y]) => level.putLongCloud(x, y, 2));
  THREE_CLOUDS.forEach(([x, y]) => level.putLongCloud(x, y, 3));
  BIG_HILLS.forEach((x) => level.putBigHill(x, SCENERY_ROW));
  SMALL_HILLS.forEach((x) => level.putSmallHill(x, SCENERY_ROW));
  BUSHES.forEach((x) => level.putBush(x, SCENERY_ROW));
  TWO_BUSHES.forEach((x) => level.putLongBush(x, SCENERY_ROW, 2));
  THREE_BUSHES.forEach((x) => level.putLongBush(x, SCENERY_ROW, 3));

  QUESTION_BLOCKS.forEach(([x, y, item]) => level.putQBlock(x, y, item));
  BRICKS.forEach(([x, y, item]) => level.putBrick(x, y, item));
  TILE_PIPES.forEach(([x, height]) => level.putPipe(x, GROUND_ROW, height));
  STAIRS.forEach(([x, height]) => level.putWall(x, GROUND_ROW, height));
  level.putRealPipe(57, 9, 4, 'DOWN', () => game.loadLevel('1-1-bonus'));
  level.putFlagpole(198);
  level.putCastle();

  GOOMBAS.forEach(([x, y]) => level.putGoomba(x, y));
  KOOPAS.forEach(([x, y]) => level.putKoopa(x, y));

  return level;
}
