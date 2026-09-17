import { buildLevel11 } from './level11.js';
import { buildBonus11 } from './bonus11.js';

// To add a level: write its builder and register it here.
export const LEVELS = {
  '1-1': buildLevel11,
  '1-1-bonus': buildBonus11
};

export const FIRST_LEVEL = '1-1';

export function buildLevel(name, game) {
  const build = LEVELS[name];
  if (!build) throw new Error(`Nivel desconocido: ${name}`);
  return build(game);
}
