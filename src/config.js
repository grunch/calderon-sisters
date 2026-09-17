// Shared constants. Distances are in "logical" pixels: the NES screen is 240 tall.
export const TILE = 16;
export const ROWS = 15;
export const VIEW_HEIGHT = 240;
export const MIN_VIEW_WIDTH = 256; // the classic NES width
export const MAX_VIEW_WIDTH = 432; // ~16:9, so wide screens see more of the level

// Everything the game needs lives inside this directory.
export const ASSET_ROOT = './';

export const START_LIVES = 3;
export const LEVEL_TIME = 400;
export const TIME_TICK_SECONDS = 0.4;

// Enemies further than this past the right edge of the screen stay asleep.
export const ENEMY_WAKE_MARGIN = 80;

export const STORAGE_KEYS = {
  character: 'calderon-bros.character',
  highScore: 'calderon-bros.highScore',
  muted: 'calderon-bros.muted'
};
