// S4 spike — shared types.
//
// The wire/journal vocabulary is deliberately tiny:
//  - ChangeRow  : one per-field journal row, exactly as stored in sqlite.
//  - ViewChange : one per-field change *in view space* (already filtered/projected
//                 for a specific viewer). This is what travels over a Transport.
//  - Patch      : a seq-stamped batch of ViewChanges. Live and replay both emit
//                 only Patches; the client core never sees anything else.

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

/** Raw journal row (mirrors the sqlite `changes` table). */
export interface ChangeRow {
  seq: number;
  entity_type: string;
  entity_id: string;
  key: string;
  /** JSON-encoded previous value; SQL NULL (=> null here) means "key did not exist". */
  old_json: string | null;
  /** JSON-encoded new value; SQL NULL means "key deleted". */
  new_json: string | null;
}

/**
 * A single field change as seen by ONE viewer.
 * `value === undefined` means the key leaves the view (deleted or became invisible).
 * `old` is the viewer's previous value (undefined = was not in the view). The client
 * store does not need `old`; it exists so the server-side replay machinery can
 * invert patches. A real wire format could omit it.
 */
export interface ViewChange {
  entity_type: string;
  entity_id: string;
  key: string;
  old: Json | undefined;
  value: Json | undefined;
}

/** What a Transport emits. Same shape for live tail, catch-up, and scrub. */
export interface Patch {
  seq: number;
  changes: ViewChange[];
}

/**
 * THE abstraction under test. The client core is handed a Transport and a store;
 * it must work identically whether the other end is a live server or a journal.
 */
export interface Transport {
  connect(): AsyncIterable<Patch>;
  close(): void;
}

/** Composite state key. et/eid never contain '|'; field keys may contain '.'. */
export const sk = (et: string, eid: string, key: string) => `${et}|${eid}|${key}`;
export const unsk = (k: string): [string, string, string] => {
  const a = k.indexOf('|');
  const b = k.indexOf('|', a + 1);
  return [k.slice(0, a), k.slice(a + 1, b), k.slice(b + 1)];
};
