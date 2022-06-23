/* c8 ignore start */

import { BehaviorSubject } from "rxjs";

export function bs<T>(init: T) {
  return new BehaviorSubject<T>(init);
}

export function bsu<T>(init: T | undefined = undefined) {
  return new BehaviorSubject<T | undefined>(init);
}

export function deepEqual(obj1: any, obj2: any) {
  if (obj1 === obj2)
    // it's just the same object. No need to compare.
    return true;

  if (isPrimitive(obj1) && isPrimitive(obj2))
    // compare primitives
    return obj1 === obj2;

  if (Object.keys(obj1).length !== Object.keys(obj2).length) return false;

  // compare objects with same number of keys
  for (let key in obj1) {
    if (!(key in obj2)) return false; //other object doesn't have this prop
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

//check if value is primitive
function isPrimitive(obj: any) {
  return obj !== Object(obj);
}
