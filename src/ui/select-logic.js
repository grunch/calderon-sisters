export function initialSelection(index = 0) {
  return Object.freeze({
    index,
    confirmed: false,
    held: Object.freeze({ LEFT: false, RIGHT: false, CONFIRM: false })
  });
}

/** Keys only act when they go down, so holding one moves a single step. */
export function stepSelection(state, keys, count) {
  const pressed = (key) => Boolean(keys[key]) && !state.held[key];
  const delta = (pressed('RIGHT') ? 1 : 0) - (pressed('LEFT') ? 1 : 0);

  return Object.freeze({
    index: (state.index + delta + count) % count,
    confirmed: pressed('CONFIRM'),
    held: Object.freeze({
      LEFT: Boolean(keys.LEFT),
      RIGHT: Boolean(keys.RIGHT),
      CONFIRM: Boolean(keys.CONFIRM)
    })
  });
}
