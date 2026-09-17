// Paths are relative to ASSET_ROOT.
import { characterImageFiles } from './game/characters.js';

export const IMAGES = {
  ...characterImageFiles(),
  tiles: 'sprites/tiles.png',
  castle: 'sprites/castle-house.png',
  items: 'sprites/items.png',
  enemy: 'sprites/enemy.png',
  enemyr: 'sprites/enemyr.png'
};

export const SOUNDS = {
  smallJump: 'sounds/jump-small.wav',
  bigJump: 'sounds/jump-super.wav',
  breakBlock: 'sounds/breakblock.wav',
  bump: 'sounds/bump.wav',
  coin: 'sounds/coin.wav',
  fireball: 'sounds/fireball.wav',
  flagpole: 'sounds/flagpole.wav',
  kick: 'sounds/kick.wav',
  pipe: 'sounds/pipe.wav',
  itemAppear: 'sounds/itemAppear.wav',
  powerup: 'sounds/powerup.wav',
  stomp: 'sounds/stomp.wav'
};

export const MUSIC = {
  overworld: 'sounds/aboveground_bgm.ogg',
  underground: 'sounds/underground_bgm.ogg',
  clear: 'sounds/stage_clear.wav',
  death: 'sounds/mariodie.wav'
};
