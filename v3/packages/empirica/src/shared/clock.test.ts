import { afterEach, describe, expect, it, vi } from "vitest";
import { SystemClock } from "./clock.js";

describe("SystemClock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current epoch ms via Date.now", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-29T00:00:00Z"));

    expect(SystemClock.now()).toBe(Date.parse("2026-04-29T00:00:00Z"));
  });

  it("setTimeout fires after the given delay", () => {
    vi.useFakeTimers();
    const fn = vi.fn();

    SystemClock.setTimeout(fn, 100);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("setTimeout cancel handle prevents the call", () => {
    vi.useFakeTimers();
    const fn = vi.fn();

    const cancel = SystemClock.setTimeout(fn, 100);
    cancel();

    vi.advanceTimersByTime(1_000);
    expect(fn).not.toHaveBeenCalled();
  });

  it("setInterval fires repeatedly", () => {
    vi.useFakeTimers();
    const fn = vi.fn();

    const cancel = SystemClock.setInterval(fn, 50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenCalledTimes(3);

    cancel();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
