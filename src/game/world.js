// What every entity needs to see of the running game. The Game owns it and
// swaps these fields as levels load; entities only read them and call the hooks.
export const world = {
  level: null,
  player: null,
  camera: { x: 0, y: 0 },
  viewWidth: 256,
  fireballs: [],
  audio: null,
  input: null,
  game: null // hooks: addScore, addCoin, playerDied, levelCleared, after, loadLevel
};
