import { BehaviorSubject } from "rxjs";

export function bs<T>(init: T) {
  return new BehaviorSubject<T>(init);
}

export function bsu<T>(init: T | undefined = undefined) {
  return new BehaviorSubject<T | undefined>(init);
}
