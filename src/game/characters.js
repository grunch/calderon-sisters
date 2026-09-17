// Every character uses the same sheet layout, so the player code only needs
// to know which pair of images to draw from.
export const CHARACTERS = Object.freeze([
  Object.freeze({ id: 'maite', name: 'MAITE', right: 'maite', left: 'maitel' }),
  Object.freeze({ id: 'mila', name: 'MILA', right: 'mila', left: 'milal' })
]);

// The run cycle has 8 frames. They're column offsets from the first one:
// three where the original walk was, the rest further right in the sheet.
export const RUN_FRAMES = Object.freeze([0, 1, 2, 15, 16, 17, 18, 19]);

export function characterById(id) {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}

export function characterImages() {
  return CHARACTERS.flatMap((character) => [character.right, character.left]);
}

export function characterImageFiles() {
  return Object.fromEntries(characterImages().map((key) => [key, `sprites/${key}.png`]));
}
