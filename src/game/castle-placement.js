import { TILE } from '../config.js';

const GROUND_TOP = 13 * TILE;

// sprites/castle-house.png (made by tools/build_castle.py) is 379x384 pixels.
export const CASTLE = Object.freeze({
  image: 'castle',
  width: 95,
  height: 96,
  doorCenterRatio: 0.256 // where the middle of the door is, from the left edge
});

/** Puts the castle on the ground with its door centered on the exit column. */
export function castlePlacement(exitColumn) {
  const doorCenter = exitColumn * TILE + TILE / 2;
  return {
    x: Math.round(doorCenter - CASTLE.width * CASTLE.doorCenterRatio),
    y: GROUND_TOP - CASTLE.height,
    width: CASTLE.width,
    height: CASTLE.height
  };
}
