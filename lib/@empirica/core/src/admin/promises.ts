export interface PromiseHandle<T = void> {
  promise: Promise<T>;
  result: (value: T) => void;
}

export function promiseHandle<T = void>(): PromiseHandle<T> {
  let ret = {} as PromiseHandle<T>;
  ret.promise = new Promise<T>((r) => {
    ret.result = r;
  });

  return ret;
}
