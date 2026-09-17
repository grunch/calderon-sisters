import { START_LIVES, LEVEL_TIME, TIME_TICK_SECONDS } from '../config.js';

export const COINS_PER_LIFE = 100;
export const COIN_SCORE = 200;

// A session is the state of one playthrough. Every function returns a new one.
export function createSession(characterId) {
  return Object.freeze({
    characterId,
    score: 0,
    coins: 0,
    lives: START_LIVES,
    time: LEVEL_TIME,
    clockRemainder: 0
  });
}

export function addScore(session, points) {
  return Object.freeze({ ...session, score: session.score + points });
}

export function addCoin(session) {
  const coins = session.coins + 1;
  const earnedLife = coins >= COINS_PER_LIFE;
  return Object.freeze({
    ...session,
    score: session.score + COIN_SCORE,
    coins: earnedLife ? 0 : coins,
    lives: session.lives + (earnedLife ? 1 : 0)
  });
}

export function loseLife(session) {
  return Object.freeze({
    ...session,
    lives: Math.max(0, session.lives - 1),
    time: LEVEL_TIME,
    clockRemainder: 0
  });
}

export function tickClock(session, seconds) {
  const elapsed = session.clockRemainder + seconds;
  const ticks = Math.floor(elapsed / TIME_TICK_SECONDS + 1e-9);
  return Object.freeze({
    ...session,
    time: Math.max(0, session.time - ticks),
    clockRemainder: elapsed - ticks * TIME_TICK_SECONDS
  });
}
