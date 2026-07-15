// S4 spike driver: generate -> project -> live-follow -> replay/scrub asserts ->
// UI frames -> benchmarks. Run: bun src/main.ts
import { join } from 'node:path';
import { generateSession } from './generate';
import {
  buildViewStreamIncremental,
  buildViewStreamReference,
  loadChanges,
  loadVisRules,
  makeVisibility,
} from './projector';
import { LiveTransport, ReplayTransport, type ScrubStrategy } from './transport';
import { MirrorStore, runClient } from './store';
import { render } from './render';
import type { Patch } from './types';
import { fmtMs, rng, randInt, serializeState, shuffled, waitFor } from './util';

const DIR = join(import.meta.dir, '..');
const EMPTY_FP = serializeState(new Map());

let failures = 0;
let checks = 0;
function assert(cond: boolean, msg: string): void {
  checks++;
  if (!cond) {
    failures++;
    console.log(`  ✗ FAIL: ${msg}`);
  }
}
const section = (t: string) => console.log(`\n=== ${t} ===`);

// ---------------------------------------------------------------------------
section('1. Generate toy session (2 players, 5 rounds) into bun:sqlite');
const smallPath = join(DIR, 'session-small.db');
const t0 = performance.now();
const small = generateSession(smallPath, { rounds: 5, chatPerRound: 14, seed: 42 });
console.log(
  `  wrote ${small.maxSeq} change rows to ${smallPath} in ${fmtMs(performance.now() - t0)}`,
);

const rows = loadChanges(small.db);
const visible = makeVisibility(loadVisRules(small.db));
const viewers = small.playerIds; // ['p1','p2']

// ---------------------------------------------------------------------------
section('2. Project per-player view streams; verify incremental == reference');
const streams: Record<string, Patch[]> = {};
for (const v of viewers) {
  const inc = buildViewStreamIncremental(rows, visible, v);
  const ref = buildViewStreamReference(rows, visible, v);
  assert(
    JSON.stringify(inc) === JSON.stringify(ref),
    `incremental projector matches reference for ${v}`,
  );
  streams[v] = inc;
  console.log(`  ${v}: ${inc.length} view patches from ${rows.length} raw rows`);
}

// Leak checks at the stream level: admin-only + other-player-private must be absent.
for (const v of viewers) {
  let secretLeaks = 0;
  let logLeaks = 0;
  for (const p of streams[v])
    for (const c of p.changes) {
      if (c.entity_type === 'round' && c.key === 'secret') secretLeaks++;
      if (c.entity_type === 'player' && c.key.startsWith('log.') && c.entity_id !== v) logLeaks++;
    }
  assert(secretLeaks === 0, `${v} stream never contains round.secret`);
  assert(logLeaks === 0, `${v} stream never contains the other player's private log`);
}

// ---------------------------------------------------------------------------
section('3. Live follow (accelerated) — record per-seq snapshots + visibility invariant');
type Snap = { seq: number; fp: string };
const liveSnaps: Record<string, Snap[]> = {};
for (const v of viewers) {
  const store = new MirrorStore();
  const snaps: Snap[] = [];
  const live = new LiveTransport(streams[v], 0); // 0ms tick = fully accelerated
  await runClient(live, store, (patch, st) => {
    // dynamic-visibility invariant: opponent guess in view => that round is revealed
    for (const c of patch.changes) {
      if (
        c.entity_type === 'playerRound' &&
        c.key === 'guess' &&
        c.value !== undefined &&
        !c.entity_id.startsWith(`${v}~`)
      ) {
        const rid = c.entity_id.split('~')[1];
        assert(
          st.get('round', rid, 'revealed') === true,
          `${v}: opponent guess for ${rid} only visible once revealed (seq ${patch.seq})`,
        );
      }
    }
    snaps.push({ seq: patch.seq, fp: st.fingerprint() });
  });
  liveSnaps[v] = snaps;
  console.log(`  ${v}: followed ${store.patchesApplied} patches, final seq ${store.seq}`);
}
const liveStateAt = (v: string, seq: number): string => {
  const snaps = liveSnaps[v];
  let lo = 0,
    hi = snaps.length - 1,
    ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (snaps[mid].seq <= seq) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans === -1 ? EMPTY_FP : snaps[ans].fp;
};

// ---------------------------------------------------------------------------
section('4. EXIT CRITERION — 20 random checkpoints: replay state === live state');
const crng = rng(20260715);
const checkpoints: number[] = [];
while (checkpoints.length < 20) {
  const s = randInt(crng, 0, small.maxSeq);
  if (!checkpoints.includes(s)) checkpoints.push(s);
}
const strategies: ScrubStrategy[] = ['snapshot-forward', 'inverse-backward'];

// 4a. Cold connect at each checkpoint (fresh transport = admin opens scrubber there).
for (const strategy of strategies) {
  let ok = 0;
  for (const v of viewers) {
    for (const target of checkpoints) {
      const t = new ReplayTransport(streams[v], target, strategy, 50);
      const store = new MirrorStore();
      const done = runClient(t, store);
      await waitFor(() => store.seq === target);
      const match = store.fingerprint() === liveStateAt(v, target);
      assert(match, `[${strategy}] cold connect ${v}@seq ${target} equals live`);
      if (match) ok++;
      t.close();
      await done;
    }
  }
  console.log(`  ${strategy}: cold connect ${ok}/${viewers.length * checkpoints.length} checkpoints equal`);
}

// 4b. Scrub walk: ONE transport per player, stepTo through the 20 checkpoints in
// shuffled order — exercises forward AND backward moves on a persistent client.
for (const strategy of strategies) {
  let fwd = 0,
    bwd = 0,
    ok = 0;
  for (const v of viewers) {
    const walk = shuffled(rng(7 + viewers.indexOf(v)), checkpoints);
    const t = new ReplayTransport(streams[v], walk[0], strategy, 50);
    const store = new MirrorStore();
    const done = runClient(t, store);
    await waitFor(() => store.seq === walk[0]);
    assert(
      store.fingerprint() === liveStateAt(v, walk[0]),
      `[${strategy}] scrub start ${v}@${walk[0]}`,
    );
    let prev = walk[0];
    for (const target of walk.slice(1)) {
      target > prev ? fwd++ : bwd++;
      t.stepTo(target);
      await waitFor(() => store.seq === target);
      const match = store.fingerprint() === liveStateAt(v, target);
      assert(match, `[${strategy}] scrub ${v}: ${prev} -> ${target} equals live`);
      if (match) ok++;
      prev = target;
    }
    t.close();
    await done;
  }
  console.log(
    `  ${strategy}: scrub walk ${ok}/${(checkpoints.length - 1) * viewers.length} steps equal (${fwd} forward, ${bwd} backward)`,
  );
}

// ---------------------------------------------------------------------------
section('5. Mid-session visibility flip at the reveal boundary (round 2)');
const revealSeqOf = (rid: string): number =>
  (
    small.db
      .query(
        `SELECT seq FROM changes WHERE entity_type='round' AND entity_id=? AND key='revealed' AND new_json='true'`,
      )
      .get(rid) as { seq: number }
  ).seq;
const rev2 = revealSeqOf('r2');
{
  const t = new ReplayTransport(streams.p1, rev2 - 1, 'inverse-backward');
  const store = new MirrorStore();
  const done = runClient(t, store);
  await waitFor(() => store.seq === rev2 - 1);
  assert(
    store.get('playerRound', 'p2~r2', 'guess') === undefined,
    'p1 does NOT see p2 guess at revealSeq-1',
  );
  t.stepTo(rev2);
  await waitFor(() => store.seq === rev2);
  assert(store.get('playerRound', 'p2~r2', 'guess') !== undefined, 'p1 DOES see p2 guess at revealSeq');
  t.stepTo(rev2 - 1); // scrub BACKWARD across the visibility boundary
  await waitFor(() => store.seq === rev2 - 1);
  assert(
    store.get('playerRound', 'p2~r2', 'guess') === undefined,
    'backward scrub across reveal re-hides p2 guess',
  );
  t.close();
  await done;
  console.log(`  reveal(r2) at seq ${rev2}: hide -> show -> re-hide all correct`);
}

// ---------------------------------------------------------------------------
section('6. UI proof — scrub frames (viewer p1 unless noted)');
{
  const frames: Array<{ label: string; seq: number; viewer: string }> = [
    { label: `mid-guessing round 2 (seq ${rev2 - 8})`, seq: rev2 - 8, viewer: 'p1' },
    { label: `same seq, OTHER viewer p2 — asymmetric views`, seq: rev2 - 8, viewer: 'p2' },
    { label: `instant before reveal (seq ${rev2 - 1})`, seq: rev2 - 1, viewer: 'p1' },
    { label: `reveal moment (seq ${rev2})`, seq: rev2, viewer: 'p1' },
    { label: `scrubbed BACKWARD into round 1 (seq ${revealSeqOf('r1') - 4})`, seq: revealSeqOf('r1') - 4, viewer: 'p1' },
    { label: `end of session (seq ${small.maxSeq})`, seq: small.maxSeq, viewer: 'p1' },
  ];
  // One persistent scrubber per viewer — frames come from stepTo, incl. backward.
  const scrubbers: Record<string, { t: ReplayTransport; store: MirrorStore; done: Promise<void> }> = {};
  for (const v of viewers) {
    const t = new ReplayTransport(streams[v], frames.find((f) => f.viewer === v)!.seq, 'inverse-backward');
    const store = new MirrorStore();
    scrubbers[v] = { t, store, done: runClient(t, store) };
  }
  for (const f of frames) {
    const { t, store } = scrubbers[f.viewer];
    if (store.seq !== f.seq) t.stepTo(f.seq);
    await waitFor(() => store.seq === f.seq);
    console.log(`\n  ── ${f.label}`);
    console.log(
      render(store, f.viewer)
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n'),
    );
  }
  for (const v of viewers) {
    scrubbers[v].t.close();
    await scrubbers[v].done;
  }
}

// ---------------------------------------------------------------------------
section('7. Cost measurements');

interface BenchResult {
  label: string;
  n: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
}
const summarize = (label: string, ms: number[]): BenchResult => {
  const s = ms.slice().sort((a, b) => a - b);
  return {
    label,
    n: ms.length,
    avgMs: ms.reduce((a, b) => a + b, 0) / ms.length,
    p95Ms: s[Math.floor(0.95 * (s.length - 1))],
    maxMs: s[s.length - 1],
  };
};
const printBench = (rs: BenchResult[]) => {
  for (const r of rs)
    console.log(
      `  ${r.label.padEnd(58)} avg ${fmtMs(r.avgMs).padStart(10)}  p95 ${fmtMs(r.p95Ms).padStart(10)}  max ${fmtMs(r.maxMs).padStart(10)}  (n=${r.n})`,
    );
};

async function benchSession(name: string, stream: Patch[], maxSeq: number): Promise<BenchResult[]> {
  const out: BenchResult[] = [];
  const brng = rng(99);
  const coldTargets = Array.from({ length: 40 }, () => randInt(brng, 0, maxSeq));

  // cold state-at-seq: naive forward-from-zero (snapshotEvery=∞ degenerates to it)
  for (const [label, every] of [
    ['cold connect, forward-from-zero (no snapshots)', Number.MAX_SAFE_INTEGER],
    ['cold connect, snapshot-forward (K=100 patches)', 100],
  ] as const) {
    const ms: number[] = [];
    for (const target of coldTargets) {
      const t = new ReplayTransport(stream, target, 'snapshot-forward', every);
      const store = new MirrorStore();
      const done = runClient(t, store);
      await waitFor(() => store.seq === target);
      ms.push(t.stats[0].ms);
      t.close();
      await done;
    }
    out.push(summarize(`${name} ${label}`, ms));
  }
  // one-time snapshot build cost + memory
  {
    const t = new ReplayTransport(stream, 0, 'snapshot-forward', 100);
    console.log(
      `  ${name} snapshot build (K=100): ${fmtMs(t.snapshotBuildMs)}, ${t.snapshotEntries} retained entries across ${Math.floor(stream.length / 100) + 1} snapshots`,
    );
    t.close();
  }

  // scrub steps: 200-step random walk (70% |Δseq|<=20 drags, 30% random jumps)
  const mkWalk = (): number[] => {
    const w = rng(1234);
    let cur = randInt(w, 0, maxSeq);
    const walk = [cur];
    for (let i = 0; i < 200; i++) {
      cur =
        w() < 0.7
          ? Math.max(0, Math.min(maxSeq, cur + (w() < 0.5 ? -1 : 1) * randInt(w, 1, 20)))
          : randInt(w, 0, maxSeq);
      walk.push(cur);
    }
    return walk;
  };
  for (const [label, strategy, every] of [
    ['scrub step, forward-from-zero (no snapshots)', 'snapshot-forward', Number.MAX_SAFE_INTEGER],
    ['scrub step, snapshot-forward (K=100)', 'snapshot-forward', 100],
    ['scrub step, inverse-backward (delta from current)', 'inverse-backward', 100],
  ] as const) {
    const walk = mkWalk();
    const t = new ReplayTransport(stream, walk[0], strategy as ScrubStrategy, every);
    const store = new MirrorStore();
    const done = runClient(t, store);
    await waitFor(() => store.seq === walk[0]);
    for (const target of walk.slice(1)) {
      if (target === store.seq) continue;
      t.stepTo(target);
      await waitFor(() => store.seq === target);
    }
    const steps = t.stats.slice(1);
    out.push(summarize(`${name} ${label}`, steps.map((s) => s.ms)));
    const drags = steps.filter((s) => Math.abs(s.to - s.from) <= 20);
    out.push(summarize(`${name}   └─ slider-drag steps only (|Δseq| ≤ 20)`, drags.map((s) => s.ms)));
    t.close();
    await done;
  }
  return out;
}

printBench(await benchSession(`[${small.maxSeq} rows]`, streams.p1, small.maxSeq));

// --- 10k-change session: measured, not just extrapolated ---
section('7b. 10k-change session (measured)');
const bigPath = join(DIR, 'session-10k.db');
const tGen = performance.now();
const big = generateSession(bigPath, { rounds: 265, chatPerRound: 12, seed: 7 });
const bigRows = loadChanges(big.db);
const bigVisible = makeVisibility(loadVisRules(big.db));
const tProj = performance.now();
const bigStream = buildViewStreamIncremental(bigRows, bigVisible, 'p1');
console.log(
  `  generated ${big.maxSeq} rows in ${fmtMs(tProj - tGen)}; projected p1 view (${bigStream.length} patches) in ${fmtMs(performance.now() - tProj)}`,
);
// equality spot-check between strategies at 10 random seqs (no O(N*S) oracle at this size)
{
  const q = rng(5);
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    const target = randInt(q, 0, big.maxSeq);
    const states: string[] = [];
    for (const strategy of strategies) {
      const t = new ReplayTransport(bigStream, target, strategy, 100);
      const store = new MirrorStore();
      const done = runClient(t, store);
      await waitFor(() => store.seq === target);
      states.push(store.fingerprint());
      t.close();
      await done;
    }
    assert(states[0] === states[1], `10k session: strategies agree at seq ${target}`);
    if (states[0] === states[1]) ok++;
  }
  console.log(`  strategy cross-check: ${ok}/10 random seqs identical between approaches`);
}
printBench(await benchSession(`[${big.maxSeq} rows]`, bigStream, big.maxSeq));

// ---------------------------------------------------------------------------
section('RESULT');
console.log(`  ${checks} assertions, ${failures} failures`);
console.log(failures === 0 ? '  EXIT CRITERION: PASS' : '  EXIT CRITERION: FAIL');
process.exitCode = failures === 0 ? 0 : 1;
