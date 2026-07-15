// LiveTransport + ReplayTransport. Both emit only Patches (view space).
//
// LiveTransport streams a per-viewer view stream in seq order, optionally with a
// per-patch delay (tickMs=0 => as fast as possible; this is the "accelerated"
// knob — a real implementation would pace on journal timestamps).
//
// ReplayTransport(targetSeq) emits ONE synthetic catch-up patch = state-at-target,
// then supports stepTo(M) for scrubbing forward and backward. Two strategies:
//
//  - 'snapshot-forward'  : keep periodic snapshots of the view state; state-at-M =
//    clone(nearest snapshot <= M) + forward patches. Emitted patch = diff(cur, target).
//    Cost O(K + |patches in gap|) per step, O(N/K * S) snapshot memory.
//
//  - 'inverse-backward'  : keep the current view state; forward step = net-apply
//    patches (cur, M]; backward step = net-apply INVERSES of patches (M, cur] in
//    reverse order (value <- old; old undefined => delete). Cost O(|Δ|) per step.
//
// Both produce byte-identical client state (asserted in main.ts); they differ
// only in cost profile.

import type { Json, Patch, Transport, ViewChange } from './types';
import { sk } from './types';
import { AsyncQueue, bisectPatches, sleep, vc } from './util';

export class LiveTransport implements Transport {
  private closed = false;
  constructor(
    private readonly stream: readonly Patch[],
    private readonly tickMs = 0,
  ) {}

  connect(): AsyncIterable<Patch> {
    const self = this;
    return (async function* () {
      for (const p of self.stream) {
        if (self.closed) return;
        if (self.tickMs > 0) await sleep(self.tickMs);
        yield p;
      }
    })();
  }

  close(): void {
    this.closed = true;
  }
}

export type ScrubStrategy = 'snapshot-forward' | 'inverse-backward';

export interface StepStat {
  from: number;
  to: number;
  ms: number;
  changesEmitted: number;
}

export class ReplayTransport implements Transport {
  private readonly q = new AsyncQueue<Patch>();
  private cur = new Map<string, Json>(); // transport-side model of the client's view state
  private curSeq = -1;
  private connected = false;
  /** snapshots[j] = view state after applying stream[0 .. j*K-1] (snapshots[0] = empty). */
  private snaps: Map<string, Json>[] = [];
  readonly stats: StepStat[] = [];
  snapshotBuildMs = 0;
  snapshotEntries = 0;

  constructor(
    private readonly stream: readonly Patch[],
    private readonly targetSeq: number,
    readonly strategy: ScrubStrategy,
    private readonly snapshotEvery = 100,
  ) {
    if (strategy === 'snapshot-forward') this.buildSnapshots();
  }

  private buildSnapshots(): void {
    const t0 = performance.now();
    const st = new Map<string, Json>();
    this.snaps.push(new Map(st));
    for (let i = 0; i < this.stream.length; i++) {
      applyPatchTo(st, this.stream[i]);
      if ((i + 1) % this.snapshotEvery === 0) this.snaps.push(new Map(st));
    }
    this.snapshotBuildMs = performance.now() - t0;
    this.snapshotEntries = this.snaps.reduce((a, s) => a + s.size, 0);
  }

  /** snapshot-forward reconstruction of state at seq (fresh map). */
  private stateAtViaSnapshots(seq: number): Map<string, Json> {
    const cnt = bisectPatches(this.stream, seq) + 1; // patches with seq <= target
    const j = Math.min(Math.floor(cnt / this.snapshotEvery), this.snaps.length - 1);
    const st = new Map(this.snaps[j]);
    for (let i = j * this.snapshotEvery; i < cnt; i++) applyPatchTo(st, this.stream[i]);
    return st;
  }

  /** forward-from-zero (used by inverse-backward for its initial catch-up). */
  private stateAtFromZero(seq: number): Map<string, Json> {
    const st = new Map<string, Json>();
    const cnt = bisectPatches(this.stream, seq) + 1;
    for (let i = 0; i < cnt; i++) applyPatchTo(st, this.stream[i]);
    return st;
  }

  connect(): AsyncIterable<Patch> {
    if (this.connected) throw new Error('already connected');
    this.connected = true;
    const t0 = performance.now();
    this.cur =
      this.strategy === 'snapshot-forward'
        ? this.stateAtViaSnapshots(this.targetSeq)
        : this.stateAtFromZero(this.targetSeq);
    this.curSeq = this.targetSeq;
    const catchup: Patch = {
      seq: this.targetSeq,
      changes: [...this.cur.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([k, v]) => vc(k, undefined, v)),
    };
    this.stats.push({
      from: -1,
      to: this.targetSeq,
      ms: performance.now() - t0,
      changesEmitted: catchup.changes.length,
    });
    this.q.push(catchup);
    return this.q;
  }

  /** Scrub to seq M (forward or backward). Emits exactly one patch. */
  stepTo(m: number): void {
    if (!this.connected) throw new Error('stepTo before connect');
    const t0 = performance.now();
    let changes: ViewChange[];
    if (this.strategy === 'snapshot-forward') {
      const target = this.stateAtViaSnapshots(m);
      changes = diffForPatch(this.cur, target);
      this.cur = target;
    } else {
      changes = this.deltaChanges(this.curSeq, m);
      applyChangesTo(this.cur, changes);
    }
    this.curSeq = m;
    const patch: Patch = { seq: m, changes };
    this.stats.push({ from: this.stats.at(-1)!.to, to: m, ms: performance.now() - t0, changesEmitted: changes.length });
    this.q.push(patch);
  }

  /** Net view-space delta between state@from and state@to using only the patch log. */
  private deltaChanges(from: number, to: number): ViewChange[] {
    const eff = new Map<string, { old: Json | undefined; value: Json | undefined; hasOld: boolean }>();
    if (to >= from) {
      const lo = bisectPatches(this.stream, from) + 1; // first patch with seq > from
      const hi = bisectPatches(this.stream, to); // last patch with seq <= to
      for (let i = lo; i <= hi; i++) {
        for (const c of this.stream[i].changes) {
          const k = sk(c.entity_type, c.entity_id, c.key);
          const e = eff.get(k);
          if (e) e.value = c.value;
          else eff.set(k, { old: c.old, value: c.value, hasOld: true });
        }
      }
    } else {
      // backward: invert patches (to, from] newest-first; final value = old of the
      // OLDEST change touched per key, which reverse iteration yields naturally.
      const hi = bisectPatches(this.stream, from);
      const lo = bisectPatches(this.stream, to) + 1;
      for (let i = hi; i >= lo; i--) {
        const p = this.stream[i];
        for (let ci = p.changes.length - 1; ci >= 0; ci--) {
          const c = p.changes[ci];
          const k = sk(c.entity_type, c.entity_id, c.key);
          const e = eff.get(k);
          if (e) e.value = c.old;
          else eff.set(k, { old: c.value, value: c.old, hasOld: true });
        }
      }
    }
    const out: ViewChange[] = [];
    for (const [k, e] of eff) {
      const curHas = this.cur.has(k);
      const curV = curHas ? this.cur.get(k) : undefined;
      // skip no-ops (key ends where it started across the window)
      if (e.value === undefined && !curHas) continue;
      if (e.value !== undefined && curHas && JSON.stringify(curV) === JSON.stringify(e.value)) continue;
      out.push(vc(k, curV, e.value));
    }
    out.sort((a, b) =>
      sk(a.entity_type, a.entity_id, a.key) < sk(b.entity_type, b.entity_id, b.key) ? -1 : 1,
    );
    return out;
  }

  close(): void {
    this.q.close();
  }
}

export function applyPatchTo(st: Map<string, Json>, p: Patch): void {
  applyChangesTo(st, p.changes);
}

export function applyChangesTo(st: Map<string, Json>, changes: readonly ViewChange[]): void {
  for (const c of changes) {
    const k = sk(c.entity_type, c.entity_id, c.key);
    if (c.value === undefined) st.delete(k);
    else st.set(k, c.value);
  }
}

function diffForPatch(a: ReadonlyMap<string, Json>, b: ReadonlyMap<string, Json>): ViewChange[] {
  const out: ViewChange[] = [];
  for (const [k, v] of b) {
    if (!a.has(k)) out.push(vc(k, undefined, v));
    else if (JSON.stringify(a.get(k)) !== JSON.stringify(v)) out.push(vc(k, a.get(k), v));
  }
  for (const [k, v] of a) if (!b.has(k)) out.push(vc(k, v, undefined));
  out.sort((x, y) =>
    sk(x.entity_type, x.entity_id, x.key) < sk(y.entity_type, y.entity_id, y.key) ? -1 : 1,
  );
  return out;
}
