// All the physics constants are tuned per frame of a 60Hz NES, so the simulation
// always advances in 1/60s steps no matter how fast the display refreshes.
export const STEP = 1 / 60;
// After a long stall (tab in the background) don't try to catch up.
export const MAX_STEPS = 5;

/** How many fixed steps to simulate for `elapsed` seconds, and the time left over. */
export function advance(accumulator, elapsed) {
  if (!(elapsed > 0)) {
    return { steps: 0, accumulator };
  }

  const total = accumulator + elapsed;
  // The tiny epsilon keeps float error from dropping a step at exactly 60Hz.
  const steps = Math.floor(total / STEP + 1e-6);

  if (steps > MAX_STEPS) {
    return { steps: MAX_STEPS, accumulator: 0 };
  }
  return { steps, accumulator: Math.max(0, total - steps * STEP) };
}
