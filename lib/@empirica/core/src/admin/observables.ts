import { E_CANCELED, Mutex } from "async-mutex";
import { Observable, Subject, concatMap, takeUntil } from "rxjs";
import { warn } from "../utils/console";

export async function awaitObsValue<T>(
  obs: Observable<T>,
  value: T
): Promise<T> {
  let res: (value: T) => void;
  const prom = new Promise<T>((r) => {
    res = r;
  });

  const unsub = obs.subscribe((val) => {
    if (val === value) {
      res(val);
    }
  });

  const val = await prom;
  unsub.unsubscribe();

  return val;
}

export async function awaitObsValueExist<T>(obs: Observable<T>): Promise<T> {
  let res: (value: T) => void;
  const prom = new Promise<T>((r) => {
    res = r;
  });

  const unsub = obs.subscribe((val) => {
    if (val) {
      res(val);
    }
  });

  const val = await prom;
  unsub.unsubscribe();

  return val;
}

export async function awaitObsValueChange<T>(obs: Observable<T>): Promise<T> {
  let res: (value: T) => void;
  const prom = new Promise<T>((r) => {
    res = r;
  });

  let once = false;
  let v: T;
  const unsub = obs.subscribe((val) => {
    if (once && val !== v) {
      res(val);
    }
    once = true;
    v = val;
  });

  const val = await prom;
  unsub.unsubscribe();

  return val;
}

// Subscribe to an observable and use the lock for sequential execution of async
// functions.
export function lockedAsyncSubscribe<T>(
  mutex: Mutex,
  obs: Observable<T>,
  fn: (val: T) => Promise<any>
) {
  return obs.subscribe({
    next: async (val) => {
      try {
        const release = await mutex.acquire();
        try {
          await fn(val);
        } catch (err) {
          console.error("error in async observable subscription");
          console.error(err);
        } finally {
          release();
        }
      } catch (err) {
        if (err !== E_CANCELED) {
          console.error(
            "error acquiring lock in async observable subscription"
          );
          console.error(err);
        }
      }
    },
  });
}

// This does not behave correctly with a ReplaySubject
export function subscribeAsync<T>(
  obs: Observable<T>,
  fn: (val: T) => Promise<any>
) {
  const cancel = new Subject<void>();
  obs.pipe(concatMap(fn), takeUntil(cancel)).subscribe();
  return {
    closed: false,
    unsubscribe() {
      if (this.closed) {
        warn("closing a closed async observable subscription");
        return;
      }
      this.closed = true;
      cancel.next();
      cancel.unsubscribe();
    },
  };
}

export interface AsyncObserver<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

export interface Unsubscribable {
  unsubscribe(): void;
}

export interface AsyncSubscribable<T> {
  subscribe(observer: Partial<AsyncObserver<T>>): Promise<Unsubscribable>;
}

// A ReplaySubject that supports async subscribers
export class AsyncReplaySubject<T> {
  private values: T[] = [];
  private subscribers: ((val: T) => Promise<void>)[] = [];

  async next(value: T) {
    this.values.push(value);
    for (const sub of this.subscribers) {
      await sub(value);
    }
  }

  async subscribe({ next }: { next: (val: T) => Promise<void> }) {
    this.subscribers.push(next);
    for (const v of this.values) {
      await next(v);
    }

    let closed = false;
    return {
      get closed() {
        return closed;
      },
      unsubscribe: () => {
        if (closed) {
          warn("closing a closed async observable subscription");
          return;
        }

        closed = true;
        this.subscribers = this.subscribers.filter((s) => s !== next);
      },
    };
  }
}

// A Subject that supports async subscribers
export class AsyncSubject<T> {
  private subscribers: ((val: T) => Promise<void>)[] = [];

  constructor(private value: T) {}

  async next(value: T) {
    for (const sub of this.subscribers) {
      await sub(value);
    }
  }

  async subscribe({ next }: { next: (val: T) => Promise<void> }) {
    this.subscribers.push(next);
    await next(this.value);

    let closed = false;
    return {
      get closed() {
        return closed;
      },
      unsubscribe: () => {
        if (closed) {
          warn("closing a closed async observable subscription");
          return;
        }

        closed = true;
        this.subscribers = this.subscribers.filter((s) => s !== next);
      },
    };
  }
}
