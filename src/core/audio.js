import { ASSET_ROOT } from '../config.js';

/** Sound effects and music on plain <audio> elements, with mute and pause. */
export class AudioManager {
  #sounds = new Map();
  #music = new Map();
  #currentMusic = null;
  #muted = false;

  constructor(sounds, music) {
    for (const [name, file] of Object.entries(sounds)) {
      this.#sounds.set(name, new Audio(ASSET_ROOT + file));
    }
    for (const [name, file] of Object.entries(music)) {
      this.#music.set(name, new Audio(ASSET_ROOT + file));
    }
  }

  get muted() {
    return this.#muted;
  }

  setMuted(muted) {
    this.#muted = muted;
    for (const audio of [...this.#sounds.values(), ...this.#music.values()]) {
      audio.muted = muted;
    }
  }

  // Browsers reject play() until the user has pressed something. That is
  // expected before the first key press, so it is reported and not fatal.
  #start(audio) {
    audio.play().catch((error) => {
      console.warn(`Audio en espera de interacción: ${error.message}`);
    });
  }

  play(name, startAt = 0) {
    const audio = this.#sounds.get(name);
    if (!audio) throw new Error(`Sonido desconocido: ${name}`);
    audio.currentTime = startAt;
    this.#start(audio);
  }

  playMusic(name, { restart = false } = {}) {
    const next = this.#music.get(name);
    if (!next) throw new Error(`Música desconocida: ${name}`);
    for (const audio of this.#music.values()) {
      if (audio !== next) audio.pause();
    }
    if (restart) next.currentTime = 0;
    this.#currentMusic = next;
    this.#start(next);
  }

  stopMusic() {
    for (const audio of this.#music.values()) audio.pause();
    this.#currentMusic = null;
  }

  pauseAll() {
    this.#currentMusic?.pause();
  }

  resumeAll() {
    if (this.#currentMusic) this.#start(this.#currentMusic);
  }
}
