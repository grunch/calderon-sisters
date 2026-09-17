import { ActionState } from './actions.js';

const KEY_BINDINGS = {
  ArrowLeft: 'LEFT', KeyA: 'LEFT',
  ArrowRight: 'RIGHT', KeyD: 'RIGHT',
  ArrowUp: 'UP', KeyW: 'UP',
  ArrowDown: 'DOWN', KeyS: 'DOWN',
  KeyX: 'JUMP', Space: 'JUMP',
  KeyZ: 'RUN', ShiftLeft: 'RUN', ShiftRight: 'RUN',
  Enter: 'CONFIRM',
  KeyP: 'PAUSE', Escape: 'PAUSE',
  KeyM: 'MUTE'
};

// Standard gamepad mapping: 0=A 1=B 2=X 3=Y 9=Start 12-15=d-pad
const PAD_BUTTONS = { 0: 'JUMP', 1: 'RUN', 2: 'RUN', 9: 'PAUSE', 12: 'UP', 13: 'DOWN', 14: 'LEFT', 15: 'RIGHT' };
const STICK_DEADZONE = 0.4;

/** Keyboard, touch buttons and gamepad, all feeding the same actions. */
export class Input {
  #actions = new ActionState();
  #padActions = new Set();

  constructor({ onFullscreen }) {
    window.addEventListener('keydown', (event) => {
      // Fullscreen has to be requested from inside the key event itself.
      if (event.code === 'KeyF' && !event.repeat) {
        onFullscreen();
        return;
      }
      const action = KEY_BINDINGS[event.code];
      if (!action) return;
      event.preventDefault(); // no page scrolling with the arrows or space
      if (!event.repeat) this.#actions.press(action, event.code);
    });
    window.addEventListener('keyup', (event) => {
      const action = KEY_BINDINGS[event.code];
      if (action) this.#actions.release(action, event.code);
    });
    window.addEventListener('blur', () => this.reset());
  }

  /** Wires every [data-action] button inside the container to its action. */
  bindTouchControls(container) {
    for (const button of container.querySelectorAll('[data-action]')) {
      const action = button.dataset.action;
      const release = () => this.#actions.release(action, 'touch');
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.#actions.press(action, 'touch');
        // Capture keeps the button held if the finger slides off it. It can
        // only fail for synthetic events, where there is nothing to capture.
        if (event.isTrusted) button.setPointerCapture(event.pointerId);
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('contextmenu', (event) => event.preventDefault());
    }
  }

  /** Gamepads have no events, so they're read once per frame. */
  pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const active = new Set();
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((button, index) => {
        if (button.pressed && PAD_BUTTONS[index]) active.add(PAD_BUTTONS[index]);
      });
      if (pad.axes[0] < -STICK_DEADZONE) active.add('LEFT');
      if (pad.axes[0] > STICK_DEADZONE) active.add('RIGHT');
      if (pad.axes[1] > STICK_DEADZONE) active.add('DOWN');
    }
    for (const action of active) this.#actions.press(action, 'gamepad');
    for (const action of this.#padActions) {
      if (!active.has(action)) this.#actions.release(action, 'gamepad');
    }
    this.#padActions = active;
  }

  isDown(action) {
    return this.#actions.isDown(action);
  }

  consumePress(action) {
    return this.#actions.consumePress(action);
  }

  clearPresses() {
    this.#actions.clearPresses();
  }

  reset() {
    this.#actions.reset();
    this.#padActions = new Set();
  }
}
