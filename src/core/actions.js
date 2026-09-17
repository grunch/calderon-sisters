/**
 * Tracks game actions (LEFT, JUMP...) fed by several sources at once: keyboard,
 * touch buttons and gamepad. An action is down while any source holds it.
 */
export class ActionState {
  #holders = new Map();
  #unreadPresses = new Set();

  press(action, source) {
    const holders = this.#holders.get(action) ?? new Set();
    if (!holders.has(source)) {
      if (holders.size === 0) this.#unreadPresses.add(action);
      holders.add(source);
      this.#holders.set(action, holders);
    }
  }

  release(action, source) {
    this.#holders.get(action)?.delete(source);
  }

  isDown(action) {
    return (this.#holders.get(action)?.size ?? 0) > 0;
  }

  /** True once per press, even when the key was released before anyone asked. */
  consumePress(action) {
    return this.#unreadPresses.delete(action);
  }

  /** Forgets taps nobody read, e.g. jumps made before a menu opened. */
  clearPresses() {
    this.#unreadPresses.clear();
  }

  reset() {
    this.#holders.clear();
    this.#unreadPresses.clear();
  }
}
