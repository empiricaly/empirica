import { describe, expect, it, vi } from "vitest";
import { FakeClock } from "./fake-clock.js";

describe("FakeClock.now", () => {
  it("starts at 0 by default", () => {
    expect(new FakeClock().now()).toBe(0);
  });

  it("respects an explicit start time", () => {
    expect(new FakeClock(1_000).now()).toBe(1_000);
  });

  it("advances exactly by the requested ms", () => {
    const c = new FakeClock(100);
    c.advance(50);
    expect(c.now()).toBe(150);
  });
});

describe("FakeClock.setTimeout", () => {
  it("does not fire before the deadline", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    c.setTimeout(fn, 100);
    c.advance(99);
    expect(fn).not.toHaveBeenCalled();
  });

  it("fires exactly once at the deadline", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    c.setTimeout(fn, 100);
    c.advance(100);
    expect(fn).toHaveBeenCalledTimes(1);

    c.advance(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires at zero ms when advanced from zero", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    c.setTimeout(fn, 0);
    expect(fn).not.toHaveBeenCalled();
    c.advance(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fires multiple timeouts in scheduled order on a single advance", () => {
    const c = new FakeClock();
    const calls: string[] = [];

    c.setTimeout(() => calls.push("a"), 100);
    c.setTimeout(() => calls.push("b"), 50);
    c.setTimeout(() => calls.push("c"), 100);

    c.advance(200);
    expect(calls).toEqual(["b", "a", "c"]);
  });

  it("cancel handle prevents the call", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    const cancel = c.setTimeout(fn, 50);
    cancel();
    c.advance(100);
    expect(fn).not.toHaveBeenCalled();
  });

  it("rejects negative ms", () => {
    const c = new FakeClock();
    expect(() => c.setTimeout(() => {}, -1)).toThrow(RangeError);
  });

  it("a callback that schedules a new timeout still fires it within the same advance", () => {
    const c = new FakeClock();
    const calls: number[] = [];

    c.setTimeout(() => {
      calls.push(c.now());
      c.setTimeout(() => calls.push(c.now()), 50);
    }, 50);

    c.advance(200);
    expect(calls).toEqual([50, 100]);
  });
});

describe("FakeClock.setInterval", () => {
  it("fires repeatedly at the given interval", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    c.setInterval(fn, 100);
    c.advance(350);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("cancel handle stops further fires", () => {
    const c = new FakeClock();
    const fn = vi.fn();

    const cancel = c.setInterval(fn, 100);
    c.advance(150);
    cancel();
    c.advance(1_000);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("rejects non-positive ms", () => {
    const c = new FakeClock();
    expect(() => c.setInterval(() => {}, 0)).toThrow(RangeError);
    expect(() => c.setInterval(() => {}, -10)).toThrow(RangeError);
  });
});

describe("FakeClock.pendingCount", () => {
  it("reports active tasks and excludes cancelled", () => {
    const c = new FakeClock();

    c.setTimeout(() => {}, 100);
    const cancel = c.setTimeout(() => {}, 200);
    c.setInterval(() => {}, 50);

    expect(c.pendingCount()).toBe(3);

    cancel();
    expect(c.pendingCount()).toBe(2);
  });

  it("decrements after a one-shot fires", () => {
    const c = new FakeClock();
    c.setTimeout(() => {}, 100);
    expect(c.pendingCount()).toBe(1);

    c.advance(100);
    expect(c.pendingCount()).toBe(0);
  });
});
