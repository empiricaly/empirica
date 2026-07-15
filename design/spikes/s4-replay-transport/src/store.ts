// Client mirror store. THE SAME code path applies live patches, replay catch-up
// patches, and scrub patches — it cannot tell them apart (that is the point).
//
// The one deliberate accommodation for replay: `apply` does not assume seq is
// monotonically increasing. A live stream happens to be monotonic; a scrub
// stream is not. Nothing else differs.

import type { Json, Patch } from './types';
import { sk } from './types';
import { serializeState } from './util';

export class MirrorStore {
  readonly state = new Map<string, Json>();
  seq = -1; // last patch seq applied (-1 = nothing yet)
  patchesApplied = 0;
  changesApplied = 0;

  apply(patch: Patch): void {
    for (const c of patch.changes) {
      const k = sk(c.entity_type, c.entity_id, c.key);
      if (c.value === undefined) this.state.delete(k);
      else this.state.set(k, c.value);
      this.changesApplied++;
    }
    this.seq = patch.seq;
    this.patchesApplied++;
  }

  get(et: string, eid: string, key: string): Json | undefined {
    return this.state.get(sk(et, eid, key));
  }

  /** All (key, value) whose state key starts with `prefix`, sorted by numeric suffix. */
  listByPrefix(prefix: string): Array<{ key: string; value: Json }> {
    const out: Array<{ key: string; value: Json; n: number }> = [];
    for (const [k, v] of this.state) {
      if (k.startsWith(prefix)) {
        const n = Number(k.slice(prefix.length));
        out.push({ key: k, value: v, n: Number.isNaN(n) ? 0 : n });
      }
    }
    out.sort((a, b) => a.n - b.n);
    return out.map(({ key, value }) => ({ key, value }));
  }

  fingerprint(): string {
    return serializeState(this.state);
  }
}

/**
 * The client core's entire transport-facing loop, shared verbatim by live and
 * replay clients. Returns a completion promise; `onPatch` is where a UI would
 * re-render.
 */
export async function runClient(
  transport: { connect(): AsyncIterable<Patch> },
  store: MirrorStore,
  onPatch?: (p: Patch, store: MirrorStore) => void,
): Promise<void> {
  for await (const patch of transport.connect()) {
    store.apply(patch);
    onPatch?.(patch, store);
  }
}
