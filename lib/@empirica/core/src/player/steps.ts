import { BehaviorSubject, map, Observable } from "rxjs";

export interface StepChange {
  id: string;
  running: boolean;
  elapsed?: number;
  remaining?: number;
}

export interface StepUpdate {
  step: StepChange;
  removed: boolean;
}

export interface StepTick {
  started: boolean;
  ended: boolean;
  elapsed: number;
  remaining: number;
  duration: number;
}

type schds = {
  cb: (args: void) => void;
  from: number;
  dur: number;
};

let scheduled: schds[] = [];

export let mockNow: number | null = null;
export function setNow(now: number) {
  if (mockNow && mockNow > now) {
    if (now === 0) {
      // This is a reset scheduled should be empty
      scheduled = [];
      /* c8 ignore next 3 */
    } else {
      throw "time must move forward";
    }
  }

  mockNow = now;

  const rescheduled: schds[] = [];
  for (const s of scheduled) {
    if (mockNow >= s.from + s.dur) {
      s.cb();
    } else {
      rescheduled.push(s);
    }
  }

  scheduled = rescheduled;
}

function pnow() {
  if (mockNow !== null) {
    return mockNow;
  } else {
    return performance.now();
  }
}

function timeout(callback: (args: void) => void, ms: number) {
  if (mockNow !== null) {
    const schd = {
      cb: callback,
      from: mockNow,
      dur: ms,
    };
    scheduled.push(schd);
  } else {
    setTimeout(callback, ms);
  }
}

// The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC, with
// leap seconds ignored.
export type Epoch = number;

export class Step {
  private running = false;
  private ticker = new BehaviorSubject<StepTick | undefined>(undefined);
  private startAt: number = 0;
  private endAt: number = 0;

  constructor(step: StepChange, ticker: Observable<DOMHighResTimeStamp>) {
    ticker.pipe(map(this.recalc.bind(this))).subscribe({
      next: (val) => {
        this.ticker.next(val);
      },
    });

    this._update(step);
  }

  private recalc(t: DOMHighResTimeStamp) {
    if (!this.running) {
      return undefined;
    }

    return {
      started: t >= this.startAt,
      ended: t >= this.endAt,
      elapsed: Math.round(t - this.startAt),
      remaining: Math.round(this.endAt - t),
      duration: this.endAt - this.startAt,
    } as StepTick;
  }

  obs(): Observable<StepTick | undefined> {
    return this.ticker;
  }

  get current() {
    return this.recalc(pnow());
  }

  // internal only
  _update(step: StepChange) {
    if (!step.running) {
      this.running = false;
      this.ticker.next(undefined);

      return;
    }

    if (
      step.elapsed === null ||
      step.remaining === null ||
      step.elapsed === undefined ||
      step.remaining === undefined
    ) {
      this.running = false;

      return;
    }

    const now = pnow();

    this.startAt = now - step.elapsed * 1000;
    this.endAt = now + step.remaining * 1000;
    this.running = step.elapsed >= 0 && step.remaining >= 0;

    this.ticker.next(this.recalc(now));
  }

  // internal only
  _stop() {
    this.running = false;
    this.ticker.next(undefined);
  }
}

export class Steps {
  private steps = new Map<string, Step>();
  private updates = new Map<string, StepChange | boolean>();
  private _hadUpdates = false;

  private ticker: BehaviorSubject<Epoch>;

  constructor(stepsObs: Observable<StepUpdate>, donesObs: Observable<void>) {
    stepsObs.subscribe({
      next: ({ step, removed }) => {
        this.update(step, removed);
      },
    });

    donesObs.subscribe({
      next: () => {
        this.next();
      },
    });

    this.ticker = new BehaviorSubject<Epoch>(Math.floor(pnow()));
    const controller = new AbortController();
    timerInterval(1000, controller.signal, (t) => {
      this.ticker.next(t);
    });
  }

  step(stepID: string): Step | undefined {
    return this.steps.get(stepID);
  }

  hadUpdates() {
    const hadUpdates = this._hadUpdates;
    this._hadUpdates = false;

    return hadUpdates;
  }

  private update(step: StepChange, removed: boolean) {
    if (removed) {
      this.updates.set(step.id, true);
    } else {
      this.updates.set(step.id, step);
    }

    this._hadUpdates = true;
  }

  private next() {
    for (const [id, stepOrDel] of this.updates) {
      let step = this.steps.get(id);
      if (typeof stepOrDel === "boolean") {
        if (step) {
          step._stop();
          this.steps.delete(id);
        }
      } else {
        if (!step) {
          step = new Step(stepOrDel, this.ticker);
          this.steps.set(id, step);
        }

        step._update(stepOrDel);
      }
    }

    this.updates.clear();
  }
}

/* c8 ignore next 6 */
export const root: any =
  typeof self === "object" && self.self == self
    ? self
    : typeof global === "object" && global.global == global
    ? global
    : {};

// nodejs support
if (!root["requestAnimationFrame"]) {
  type timecb = (t: DOMHighResTimeStamp) => void;
  root["requestAnimationFrame"] = (cb: timecb) => cb(pnow());
}

// Inspiration:
// https://www.youtube.com/watch?v=MCi6AZMkxcU
// https://gist.github.com/jakearchibald/cb03f15670817001b1157e62a076fe95
function timerInterval(
  ms: number = 1000,
  signal: AbortSignal,
  callback: (time: number) => void
) {
  // Performance should be available in Nodejs 10+.
  // Get the last rounded second, which will go negative, but that's fine, since
  // it will immediately send out its first tick, then be on the second.
  const start = Math.floor(pnow() / 1000) * 1000;

  function frame(time: number) {
    /* c8 ignore next */
    if (signal.aborted) return;
    callback(time);
    scheduleFrame(time);
  }

  function scheduleFrame(time: number) {
    const elapsed = time - start;
    const roundedElapsed = Math.round(elapsed / ms) * ms;
    const targetNext = start + roundedElapsed + ms;
    const delay = targetNext - pnow();
    timeout(() => requestAnimationFrame(frame), delay);
  }

  scheduleFrame(start);
}

// export function useAnimationInterval(
//   ms: number,
//   callback: (time: number) => void
// ) {
//   const callbackRef = React.useRef(callback);
//   React.useEffect(() => {
//     callbackRef.current = callback;
//   }, [callback]);

//   React.useEffect(() => {
//     const controller = new AbortController();
//     animationInterval(ms, controller.signal, callbackRef.current);
//     return () => controller.abort();
//   }, [ms]);
// }
