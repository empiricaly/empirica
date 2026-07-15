import type { Json, Patch, ViewChange } from './types';
import { unsk } from './types';

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (r: () => number, lo: number, hi: number) =>
  lo + Math.floor(r() * (hi - lo + 1));

export function shuffled<T>(r: () => number, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sleep = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

/** Canonical serialization of a state map, for equality checks. */
export function serializeState(m: ReadonlyMap<string, Json>): string {
  const entries = [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return JSON.stringify(entries);
}

export function jsonEq(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Diff two view-state maps into sorted ViewChanges (old from `a`, value from `b`). */
export function diffMaps(a: ReadonlyMap<string, Json>, b: ReadonlyMap<string, Json>): ViewChange[] {
  const out: ViewChange[] = [];
  for (const [k, v] of b) {
    const oldV = a.has(k) ? a.get(k) : undefined;
    if (!a.has(k) || !jsonEq(oldV, v)) out.push(vc(k, oldV, v));
  }
  for (const [k, v] of a) if (!b.has(k)) out.push(vc(k, v, undefined));
  out.sort((x, y) => cmpKey(x, y));
  return out;
}

export function vc(stateKey: string, old: Json | undefined, value: Json | undefined): ViewChange {
  const [entity_type, entity_id, key] = unsk(stateKey);
  return { entity_type, entity_id, key, old, value };
}

export const cmpKey = (a: ViewChange, b: ViewChange) => {
  const ka = `${a.entity_type}|${a.entity_id}|${a.key}`;
  const kb = `${b.entity_type}|${b.entity_id}|${b.key}`;
  return ka < kb ? -1 : ka > kb ? 1 : 0;
};

/** Largest index i such that patches[i].seq <= seq, or -1. Patches sorted by seq. */
export function bisectPatches(patches: readonly Patch[], seq: number): number {
  let lo = 0,
    hi = patches.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (patches[mid].seq <= seq) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Unbounded async queue usable as AsyncIterable — backs ReplayTransport. */
export class AsyncQueue<T> implements AsyncIterable<T> {
  private buf: T[] = [];
  private waiters: Array<(r: IteratorResult<T>) => void> = [];
  private done = false;

  push(v: T): void {
    if (this.done) return;
    const w = this.waiters.shift();
    if (w) w({ value: v, done: false });
    else this.buf.push(v);
  }

  close(): void {
    this.done = true;
    for (const w of this.waiters.splice(0)) w({ value: undefined as unknown as T, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: (): Promise<IteratorResult<T>> => {
        if (this.buf.length > 0) return Promise.resolve({ value: this.buf.shift()!, done: false });
        if (this.done) return Promise.resolve({ value: undefined as unknown as T, done: true });
        return new Promise((res) => this.waiters.push(res));
      },
    };
  }
}

/** Wait until cond() is true (used to let the async client driver drain the queue). */
export async function waitFor(cond: () => boolean, timeoutMs = 2000): Promise<void> {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > timeoutMs) throw new Error('waitFor: timeout');
    await sleep(0);
  }
}

export const fmtMs = (ms: number) =>
  ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(1)} µs`;
