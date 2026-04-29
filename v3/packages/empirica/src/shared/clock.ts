// Clock abstraction.
//
// Every piece of code that needs "now" or "wait" takes a Clock. Tests pass a
// controllable fake; production passes SystemClock. This is non-negotiable —
// time-based bugs are too easy to ship without it.

export interface Clock {
  /** Current epoch milliseconds. */
  now(): number;

  /** Schedule `fn` to run after `ms` milliseconds. Returns a cancel handle. */
  setTimeout(fn: () => void, ms: number): () => void;

  /** Schedule `fn` to run every `ms` milliseconds. Returns a cancel handle. */
  setInterval(fn: () => void, ms: number): () => void;
}

export const SystemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => {
    const handle = setTimeout(fn, ms);
    return () => clearTimeout(handle);
  },
  setInterval: (fn, ms) => {
    const handle = setInterval(fn, ms);
    return () => clearInterval(handle);
  },
};
