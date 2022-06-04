import { State, StepChange as TStep } from "@empirica/tajriba";
import { BehaviorSubject, map, Observable } from "rxjs";
import { StepChange } from "./provider";

interface StepTick {
  started: boolean;
  ended: boolean;
  ellapsed: number;
  remaining: number;
  duration: number;
}

// The number of milliseconds elapsed since January 1, 1970 00:00:00 UTC, with
// leap seconds ignored.
type Epoch = number;

export class Step {
  private running = false;
  private ticker = new BehaviorSubject<StepTick | null>(null);
  private startAt: number = 0;
  private endAt: number = 0;

  constructor(step: TStep, ticker: Observable<DOMHighResTimeStamp>) {
    ticker.pipe(map(this.recalc.bind(this))).subscribe({
      next: (val) => {
        this.ticker.next(val);
      },
    });

    this._update(step);
  }

  private recalc(t: DOMHighResTimeStamp) {
    if (!this.running) {
      return null;
    }

    return {
      started: t < this.startAt,
      ended: t > this.endAt,
      ellapsed: Math.round(t - this.startAt),
      remaining: Math.round(this.endAt - t),
      duration: this.endAt - this.startAt,
    } as StepTick;
  }

  sub() {
    return this.ticker;
  }

  remaining() {
    return this.ticker;
  }

  // internal only
  _update(step: TStep) {
    if (step.state !== State.Running) {
      this.running = false;

      return;
    }

    if (!step.ellapsed || !step.remaining) {
      this.running = false;

      return;
    }

    const now = performance.now();

    this.startAt = now - step.ellapsed * 1000;
    this.endAt = now + step.remaining * 1000;
    this.running = step.ellapsed >= 0 && step.remaining >= 0;

    this.ticker.next(this.recalc(now));
  }

  // internal only
  _stop() {
    this.running = false;
  }
}

export class Steps {
  private steps = new Map<string, Step>();
  private updates = new Map<string, TStep | boolean>();

  private abort: AbortSignal;
  private ticker: BehaviorSubject<Epoch>;

  constructor(stepsObs: Observable<StepChange>, donesObs: Observable<void>) {
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

    const controller = new AbortController();
    this.abort = controller.signal;

    this.ticker = new BehaviorSubject<Epoch>(Math.floor(performance.now()));
    timerInterval(1000, this.abort, (t) => {
      this.ticker.next(t);
    });
  }

  step(stepID: string): Step | undefined {
    return this.steps.get(stepID);
  }

  private update(step: TStep, removed: boolean) {
    if (removed) {
      this.updates.set(step.id, true);
    } else {
      this.updates.set(step.id, step);
    }
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

export const root: any =
  typeof self === "object" && self.self == self
    ? self
    : typeof global === "object" && global.global == global
    ? global
    : {};

// nodejs support
if (!root["requestAnimationFrame"]) {
  type timecb = (t: DOMHighResTimeStamp) => void;
  root["requestAnimationFrame"] = (cb: timecb) => cb(performance.now());
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
  // Get the next rounded second
  const start = Math.round(performance.now() / 1000) * 1000 + 1000;

  function frame(time: number) {
    if (signal.aborted) return;
    callback(time);
    scheduleFrame(time);
  }

  function scheduleFrame(time: number) {
    const elapsed = time - start;
    const roundedElapsed = Math.round(elapsed / ms) * ms;
    const targetNext = start + roundedElapsed + ms;
    const delay = targetNext - performance.now();
    setTimeout(() => requestAnimationFrame(frame), delay);
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
