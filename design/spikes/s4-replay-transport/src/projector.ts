// View projection: raw journal -> per-viewer Patch stream ("view stream").
//
// Core idea of the spike: BOTH transports speak view-space. The projector turns
// raw `changes` rows into per-viewer patches whose `old` fields are the viewer's
// previous *view* values (not the raw old_json!). That property is what makes
// backward scrubbing by inverse-application sound even when visibility changes
// mid-session (a field edited while invisible has a raw old_json the client
// never saw).
//
// Two implementations:
//  - buildViewStreamReference : full re-projection + diff at every seq. O(N*S).
//    Trivially correct; used as the oracle.
//  - buildViewStreamIncremental : O(1) per row, plus a scan when a
//    visibility-DEPENDENCY key changes (round.revealed affects that round's
//    playerRound.guess keys). Used for the 10k-row session.

import type { Database } from 'bun:sqlite';
import type { ChangeRow, Json, Patch, ViewChange } from './types';
import { sk, unsk } from './types';
import { cmpKey, jsonEq, vc } from './util';

export interface VisRule {
  priority: number;
  entity_type: string;
  key_pattern: string;
  rule: string;
}

export function loadChanges(db: Database): ChangeRow[] {
  return db
    .query('SELECT seq, entity_type, entity_id, key, old_json, new_json FROM changes ORDER BY seq')
    .all() as ChangeRow[];
}

export function loadVisRules(db: Database): VisRule[] {
  return db
    .query('SELECT priority, entity_type, key_pattern, rule FROM visibility ORDER BY priority')
    .all() as VisRule[];
}

const ownerOf = (et: string, eid: string): string | null => {
  if (et === 'player') return eid;
  if (et === 'playerRound') return eid.split('~')[0]; // 'p1~r3' -> 'p1'
  return null;
};
const roundOf = (eid: string): string => eid.split('~')[1]; // 'p1~r3' -> 'r3'

const matches = (pattern: string, key: string): boolean => {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) return key.startsWith(pattern.slice(0, -1)); // 'log.*' -> 'log.'
  return pattern === key;
};

export type VisibilityFn = (
  et: string,
  eid: string,
  key: string,
  viewer: string,
  raw: ReadonlyMap<string, Json>,
) => boolean;

export function makeVisibility(rules: VisRule[]): VisibilityFn {
  return (et, eid, key, viewer, raw) => {
    for (const r of rules) {
      if (r.entity_type !== et || !matches(r.key_pattern, key)) continue;
      switch (r.rule) {
        case 'public':
          return true;
        case 'admin':
          return false; // players never see it
        case 'owner':
          return ownerOf(et, eid) === viewer;
        case 'owner-until-revealed':
          return (
            ownerOf(et, eid) === viewer ||
            raw.get(sk('round', roundOf(eid), 'revealed')) === true
          );
        default:
          throw new Error(`unknown rule ${r.rule}`);
      }
    }
    return false; // default deny
  };
}

const applyRawRow = (raw: Map<string, Json>, row: ChangeRow) => {
  const k = sk(row.entity_type, row.entity_id, row.key);
  if (row.new_json === null) raw.delete(k);
  else raw.set(k, JSON.parse(row.new_json) as Json);
};

/** Oracle: full projection + diff per seq. */
export function buildViewStreamReference(
  rows: ChangeRow[],
  visible: VisibilityFn,
  viewer: string,
): Patch[] {
  const raw = new Map<string, Json>();
  let prevView = new Map<string, Json>();
  const patches: Patch[] = [];
  for (const row of rows) {
    applyRawRow(raw, row);
    const view = new Map<string, Json>();
    for (const [k, v] of raw) {
      const [et, eid, key] = unsk(k);
      if (visible(et, eid, key, viewer, raw)) view.set(k, v);
    }
    const changes: ViewChange[] = [];
    for (const [k, v] of view) {
      const oldV = prevView.has(k) ? prevView.get(k) : undefined;
      if (!prevView.has(k) || !jsonEq(oldV, v)) changes.push(vc(k, oldV, v));
    }
    for (const [k, v] of prevView) if (!view.has(k)) changes.push(vc(k, v, undefined));
    if (changes.length > 0) {
      changes.sort(cmpKey);
      patches.push({ seq: row.seq, changes });
    }
    prevView = view;
  }
  return patches;
}

/**
 * Incremental projection. Per raw row, only re-evaluates visibility of:
 *  (a) the changed key itself, and
 *  (b) keys whose visibility DEPENDS on the changed key.
 * Dependency (b) is hardwired here for `round.revealed` -> that round's guesses.
 * A real engine needs a declared dependency index for exactly this reason
 * (see README: design constraints).
 */
export function buildViewStreamIncremental(
  rows: ChangeRow[],
  visible: VisibilityFn,
  viewer: string,
): Patch[] {
  const raw = new Map<string, Json>();
  const view = new Map<string, Json>();
  // index: roundId -> state keys of guess fields in that round (for dep (b))
  const guessKeysByRound = new Map<string, string[]>();
  const patches: Patch[] = [];

  for (const row of rows) {
    applyRawRow(raw, row);
    const changedKey = sk(row.entity_type, row.entity_id, row.key);
    if (row.entity_type === 'playerRound' && row.key === 'guess' && row.new_json !== null) {
      const rid = roundOf(row.entity_id);
      const list = guessKeysByRound.get(rid) ?? [];
      if (!list.includes(changedKey)) {
        list.push(changedKey);
        guessKeysByRound.set(rid, list);
      }
    }

    const affected = [changedKey];
    if (row.entity_type === 'round' && row.key === 'revealed') {
      affected.push(...(guessKeysByRound.get(row.entity_id) ?? []));
    }

    const changes: ViewChange[] = [];
    for (const k of affected) {
      const [et, eid, key] = unsk(k);
      const inRaw = raw.has(k);
      const nowVisible = inRaw && visible(et, eid, key, viewer, raw);
      const newVal = nowVisible ? raw.get(k)! : undefined;
      const hadVal = view.has(k) ? view.get(k) : undefined;
      const had = view.has(k);
      if (nowVisible && (!had || !jsonEq(hadVal, newVal))) {
        changes.push(vc(k, hadVal, newVal));
        view.set(k, newVal!);
      } else if (!nowVisible && had) {
        changes.push(vc(k, hadVal, undefined));
        view.delete(k);
      }
    }
    if (changes.length > 0) {
      changes.sort(cmpKey);
      patches.push({ seq: row.seq, changes });
    }
  }
  return patches;
}
