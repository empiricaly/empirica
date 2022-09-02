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

  let count = 0;
  const unsub = obs.subscribe((val) => {
    if (count === 1) {
      res(val);
    }
    count++;
  });

  const val = await prom;
  unsub.unsubscribe();

  return val;
}

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
