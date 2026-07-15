// S6 spike: per-field external store for the Empirica v3 client.
//
// Design claims under test:
//   - N unrelated field changes cause exactly N subscriber re-renders.
//   - set(key, v) notifies ONLY that key's subscribers.
//   - getSnapshot returns stable references for unchanged values (required by
//     useSyncExternalStore: if the snapshot identity changes on every call,
//     React 18/19 detects it in dev and errors with "The result of getSnapshot
//     should be cached" + "Maximum update depth exceeded").
//
// Plain .ts, no enums/namespaces — runs under Node 22 native type stripping.

import ReactPkg from 'react';
const { useSyncExternalStore, useCallback } = ReactPkg;

type Listener = () => void;

const EMPTY_LIST: readonly unknown[] = Object.freeze([]);

export interface FieldStore {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getList(key: string): readonly unknown[];
  append(key: string, item: unknown): void;
  subscribe(key: string, listener: Listener): () => void;
  /** Escape hatch for tests: notify a key's subscribers WITHOUT changing the
   *  value, to demonstrate that React itself bails out when getSnapshot
   *  returns an identical reference. */
  notify(key: string): void;
  /** Number of live subscriptions across all keys (test introspection). */
  subscriberCount(): number;
}

export function createFieldStore(): FieldStore {
  const values = new Map<string, unknown>();
  const subs = new Map<string, Set<Listener>>();

  function notify(key: string): void {
    const set = subs.get(key);
    if (!set || set.size === 0) return;
    // Copy: a listener may unsubscribe during notification.
    for (const l of Array.from(set)) l();
  }

  function get(key: string): unknown {
    // Stable reference: the Map holds the same value object until set()
    // replaces it, so useSyncExternalStore sees an unchanged snapshot.
    return values.get(key);
  }

  function set(key: string, value: unknown): void {
    // Store-level bailout: same value (Object.is) -> no notification at all.
    // Even without this, React would bail (same snapshot ref), but bailing
    // here also skips the subscriber walk + getSnapshot calls.
    if (Object.is(values.get(key), value)) return;
    values.set(key, value);
    notify(key);
  }

  function getList(key: string): readonly unknown[] {
    return (values.get(key) as readonly unknown[] | undefined) ?? EMPTY_LIST;
  }

  function append(key: string, item: unknown): void {
    const prev = (values.get(key) as readonly unknown[] | undefined) ?? EMPTY_LIST;
    // Append-only list: each append creates a NEW array (O(n) copy) so the
    // snapshot reference changes exactly when content changes. Implication:
    // k appends to a list of length n cost O(n*k + k^2/2) copying — fine for
    // chat-sized lists, wrong shape for high-volume logs (see README).
    values.set(key, [...prev, item]);
    notify(key);
  }

  function subscribe(key: string, listener: Listener): () => void {
    let s = subs.get(key);
    if (!s) {
      s = new Set();
      subs.set(key, s);
    }
    s.add(listener);
    return () => {
      s.delete(listener);
      if (s.size === 0) subs.delete(key);
    };
  }

  function subscriberCount(): number {
    let n = 0;
    for (const s of subs.values()) n += s.size;
    return n;
  }

  return { get, set, getList, append, subscribe, notify, subscriberCount };
}

/** Subscribe to a single scalar field. Re-renders only when THIS key's value
 *  changes (reference inequality per Object.is). */
export function useField(store: FieldStore, key: string): unknown {
  // subscribe identity must be stable across renders: if a fresh closure is
  // passed each render, React unsubscribes + resubscribes on every render.
  const subscribe = useCallback(
    (cb: Listener) => store.subscribe(key, cb),
    [store, key],
  );
  // getSnapshot identity may change per render; only the RETURNED VALUE must
  // be stable between store mutations.
  return useSyncExternalStore(subscribe, () => store.get(key));
}

/** Subscribe to an append-only list field. Snapshot is the same array
 *  reference until an append replaces it. */
export function useList(store: FieldStore, key: string): readonly unknown[] {
  const subscribe = useCallback(
    (cb: Listener) => store.subscribe(key, cb),
    [store, key],
  );
  return useSyncExternalStore(subscribe, () => store.getList(key));
}
