import { NOW } from "./constants.js";
import type { GlobalWithNow } from "./env.js";

/**
 * The `CLOCK` constant is a universal monotonically increasing clock. The `Timestamp` class is used
 * in `@starbeam/timeline` and `@starbeam/core`, but `Timestamp` defers to this constant. This means
 * that multiple copies of `@starbeam/timeline` will still see the same monotonically increasing clock.
 *
 * The term "timestamp" is used in this context to refer to a monotonically increasing number, where
 * each number represents a different moment in time.
 */
let CLOCK = (globalThis as unknown as GlobalWithNow)[NOW];

if (!CLOCK) {
  CLOCK = (globalThis as unknown as GlobalWithNow)[NOW] = {
    timestamp: 0,
  };
}

/**
 * Get the current timestamp.
 */
export function now(): number {
  return CLOCK.timestamp;
}

/**
 * Increment the current timestamp, and return the new one.
 */
export function bump(): number {
  CLOCK.timestamp = CLOCK.timestamp + 1;
  return now();
}
