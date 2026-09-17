import { Level } from '../level.js';
import { createTheme } from '../theme.js';

const COIN_ROWS = [
  [5, [5, 6, 7, 8, 9]],
  [7, [4, 5, 6, 7, 8, 9, 10]],
  [9, [4, 5, 6, 7, 8, 9, 10]]
];
const PLATFORM_COLUMNS = [4, 5, 6, 7, 8, 9, 10];
// Where the exit pipe drops the player back in 1-1.
const RETURN_POS = [2616, 177];

/** The underground coin room of 1-1. It is one screen wide and doesn't scroll. */
export function buildBonus11(game) {
  const level = new Level({
    theme: createTheme('underground'),
    playerPos: [40, 16],
    scrolling: false,
    background: '#000000',
    music: 'underground',
    restartMusic: true,
    width: 16,
    starColors: [144, 192, 240]
  });

  level.putFloor(0, 16);
  level.putWall(0, 13, 11);
  PLATFORM_COLUMNS.forEach((column) => {
    level.putWall(column, 13, 3);
    level.putWall(column, 3, 1);
  });
  COIN_ROWS.forEach(([row, columns]) => columns.forEach((column) => level.putCoin(column, row)));

  level.putRealPipe(13, 11, 3, 'RIGHT', () => {
    game.loadLevel('1-1');
    game.player.pos = [...RETURN_POS];
    game.player.pipe('UP', () => {});
  });
  level.putPipe(15, 13, 13);

  return level;
}
