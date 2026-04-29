import type { Clock } from "../shared/clock.js";

// FakeClock — a controllable Clock for tests.
//
// Time only moves when you call `advance()`. Timers fire in the order they
// were scheduled; ties are resolved FIFO. We deliberately do not support
// real wall-clock progression; tests that need that should use vitest's
// `vi.useFakeTimers()` against the SystemClock instead.

interface ScheduledTask {
  id: number;
  fireAt: number;
  fn: () => void;
  /** For intervals only. undefined for one-shot timeouts. */
  intervalMs?: number;
  cancelled: boolean;
}

export class FakeClock implements Clock {
  private current: number;
  private nextId = 1;
  private tasks: ScheduledTask[] = [];

  constructor(start = 0) {
    this.current = start;
  }

  now(): number {
    return this.current;
  }

  setTimeout(fn: () => void, ms: number): () => void {
    if (ms < 0) throw new RangeError("FakeClock.setTimeout: ms must be >= 0");
    const task: ScheduledTask = {
      id: this.nextId++,
      fireAt: this.current + ms,
      fn,
      cancelled: false,
    };
    this.tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  }

  setInterval(fn: () => void, ms: number): () => void {
    if (ms <= 0) throw new RangeError("FakeClock.setInterval: ms must be > 0");
    const task: ScheduledTask = {
      id: this.nextId++,
      fireAt: this.current + ms,
      fn,
      intervalMs: ms,
      cancelled: false,
    };
    this.tasks.push(task);
    return () => {
      task.cancelled = true;
    };
  }

  /** Advance the clock by `ms`, firing all due tasks in order. */
  advance(ms: number): void {
    if (ms < 0) throw new RangeError("FakeClock.advance: ms must be >= 0");
    const target = this.current + ms;

    // Drain due tasks until we reach target. Each drained task may add new
    // tasks; they will be picked up on subsequent iterations if due.
    while (true) {
      const next = this.dueTask(target);
      if (!next) break;

      this.current = next.fireAt;
      if (!next.cancelled) {
        next.fn();
      }

      if (next.intervalMs !== undefined && !next.cancelled) {
        next.fireAt = next.fireAt + next.intervalMs;
      } else {
        this.removeTask(next.id);
      }
    }

    this.current = target;
  }

  /** Number of pending (non-cancelled) tasks. Useful for leak assertions. */
  pendingCount(): number {
    return this.tasks.filter((t) => !t.cancelled).length;
  }

  private dueTask(target: number): ScheduledTask | undefined {
    let earliest: ScheduledTask | undefined;
    for (const t of this.tasks) {
      if (t.cancelled) continue;
      if (t.fireAt > target) continue;
      if (!earliest) {
        earliest = t;
        continue;
      }
      if (t.fireAt < earliest.fireAt) {
        earliest = t;
      } else if (t.fireAt === earliest.fireAt && t.id < earliest.id) {
        earliest = t;
      }
    }
    return earliest;
  }

  private removeTask(id: number): void {
    const i = this.tasks.findIndex((t) => t.id === id);
    if (i >= 0) this.tasks.splice(i, 1);
  }
}
