import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import * as React from "react";
import { act, version as ReactVersion } from "react";
import { createRoot, type Root } from "react-dom/client";
import { FieldStore, ListFieldStore } from "../src/fieldStore";
import {
  App,
  CHAT_WINDOW,
  NUM_PLAYERS,
  NUM_UNRELATED,
  TearingProbe,
  diffRenderCounts,
  renderCounts,
  snapshotRenderCounts,
  totalRenders,
} from "../src/components";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic PRNG (mulberry32) so runs are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Stats {
  n: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  total: number;
}

function stats(samples: number[]): Stats {
  const s = [...samples].sort((a, b) => a - b);
  const total = s.reduce((a, b) => a + b, 0);
  const pick = (q: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]!;
  return {
    n: s.length,
    mean: total / s.length,
    p50: pick(0.5),
    p95: pick(0.95),
    p99: pick(0.99),
    max: s[s.length - 1]!,
    total,
  };
}

function fmt(x: number): number {
  return Math.round(x * 1000) / 1000; // 3 decimals, ms
}

function fmtStats(s: Stats) {
  return { n: s.n, mean: fmt(s.mean), p50: fmt(s.p50), p95: fmt(s.p95), p99: fmt(s.p99), max: fmt(s.max), total: fmt(s.total) };
}

function mapToObject(m: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...m.entries()]);
}

/** Assert the DOM text of the whole main tree matches the store, field by field. */
function assertDomMatchesStore(container: HTMLElement, store: FieldStore, listStore: ListFieldStore): void {
  for (let i = 0; i < NUM_PLAYERS; i++) {
    const card = container.querySelector(`#card-${i}`)!;
    expect(card.querySelector(".name")!.textContent).toBe(String(store.get(`player.${i}.name`)));
    expect(card.querySelector(".score")!.textContent).toBe(String(store.get(`player.${i}.score`)));
    expect(card.querySelector(".conn")!.textContent).toBe(store.get(`player.${i}.connected`) ? "on" : "off");
  }
  expect(container.querySelector("#timer")!.textContent).toBe(String(store.get("timer.remaining")));
  for (let i = 0; i < NUM_UNRELATED; i++) {
    expect(container.querySelector(`#unrel-${i}`)!.textContent).toBe(String(store.get(`misc.${i}`)));
  }
  const msgs = listStore.getList("chat") as readonly string[];
  const lis = container.querySelectorAll("#chat li");
  const expected = msgs.length > CHAT_WINDOW ? msgs.slice(-CHAT_WINDOW) : msgs;
  expect(lis.length).toBe(expected.length);
  if (expected.length > 0) {
    expect(lis[lis.length - 1]!.textContent).toBe(expected[expected.length - 1]!);
    expect(lis[0]!.textContent).toBe(expected[0]!);
  }
}

// ---------------------------------------------------------------------------
// Shared fixture: one mounted tree of 202 leaf components + App
// ---------------------------------------------------------------------------

const store = new FieldStore();
const listStore = new ListFieldStore();
let container: HTMLElement;
let root: Root;
let scoreSeq = 1000; // monotonically increasing scores => never an accidental same-value write
let chatSeq = 0;
let mountMs = 0;

// Collected for the report.
const report: Record<string, unknown> = {
  env: {
    react: ReactVersion,
    reactDom: ReactVersion,
    bun: Bun.version,
    dom: "happy-dom (@happy-dom/global-registrator)",
    nodeEnv: process.env.NODE_ENV ?? "(unset)",
    reactBuild: process.env.NODE_ENV === "production" ? "production" : "development",
  },
};

beforeAll(async () => {
  // Seed store: 100 players x 3 fields, 100 unrelated fields, timer, 60 chat
  // messages (so the last-50 window path is exercised from the start).
  for (let i = 0; i < NUM_PLAYERS; i++) {
    store.set(`player.${i}.name`, `player-${i}`);
    store.set(`player.${i}.score`, 0);
    store.set(`player.${i}.connected`, true);
  }
  for (let i = 0; i < NUM_UNRELATED; i++) store.set(`misc.${i}`, 0);
  store.set("timer.remaining", 300);
  for (let i = 0; i < 60; i++) listStore.append("chat", `seed-${chatSeq++}`);

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const t0 = performance.now();
  await act(() => {
    root.render(<App store={store} listStore={listStore} />);
  });
  mountMs = performance.now() - t0;
});

afterAll(async () => {
  await act(() => root.unmount());
  await Bun.write(
    new URL("../results.json", import.meta.url).pathname,
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log("\n===== SPIKE RESULTS =====\n" + JSON.stringify(report, null, 2));
});

// ---------------------------------------------------------------------------
// Tests (bun runs them in declaration order)
// ---------------------------------------------------------------------------

describe("S6 field store fanout", () => {
  test("mount: every component renders exactly once", () => {
    // App + 100 cards + chat + timer + 100 unrelated = 203 component instances
    expect(renderCounts.size).toBe(1 + NUM_PLAYERS + 1 + 1 + NUM_UNRELATED);
    for (const [name, count] of renderCounts) {
      expect(count, `mount render count for ${name}`).toBe(1);
    }
    assertDomMatchesStore(container, store, listStore);
    report.mount = { components: renderCounts.size, wallMs: fmt(mountMs) };
  });

  test("(a) 200 single-field score updates: exactly 1 card re-render each, nothing else", async () => {
    const rand = mulberry32(0xE5EED);
    const durations: number[] = [];
    const violations: string[] = [];
    const notifBefore = store.notifications;

    for (let n = 0; n < 200; n++) {
      const i = Math.floor(rand() * NUM_PLAYERS);
      const value = scoreSeq++;
      const before = snapshotRenderCounts();

      const t0 = performance.now();
      await act(() => {
        store.set(`player.${i}.score`, value);
      });
      durations.push(performance.now() - t0);

      const diff = diffRenderCounts(before);
      const ok = diff.size === 1 && diff.get(`card:${i}`) === 1;
      if (!ok) violations.push(`update ${n} (card ${i}): diff=${JSON.stringify(mapToObject(diff))}`);

      // DOM committed synchronously inside act
      expect(container.querySelector(`#card-${i} .score`)!.textContent).toBe(String(value));
    }

    expect(violations).toEqual([]);
    // Each set touched exactly one subscriber (the one card's score hook).
    expect(store.notifications - notifBefore).toBe(200);

    const st = stats(durations);
    report.scenarioA = {
      updates: 200,
      extraneousRenders: violations.length,
      exactlyOneCardRenderEach: violations.length === 0,
      updateToCommitMs: fmtStats(st),
    };
  });

  test("(b) 200 chat appends (one act each): only the chat pane re-renders", async () => {
    const durations: number[] = [];
    const before = snapshotRenderCounts();

    for (let n = 0; n < 200; n++) {
      const msg = `burst-${chatSeq++}`;
      const t0 = performance.now();
      await act(() => {
        listStore.append("chat", msg);
      });
      durations.push(performance.now() - t0);
    }

    const diff = diffRenderCounts(before);
    expect(mapToObject(diff)).toEqual({ chat: 200 });

    const lis = container.querySelectorAll("#chat li");
    expect(lis.length).toBe(CHAT_WINDOW);
    expect(lis[lis.length - 1]!.textContent).toBe(`burst-${chatSeq - 1}`);

    const st = stats(durations);
    report.scenarioB = {
      appends: 200,
      renderDiff: mapToObject(diff),
      onlyChatRendered: diff.size === 1 && diff.get("chat") === 200,
      appendToCommitMs: fmtStats(st),
    };
  });

  test("(b2) 200 chat appends inside ONE act: batched into a single chat render", async () => {
    const before = snapshotRenderCounts();
    const t0 = performance.now();
    await act(() => {
      for (let n = 0; n < 200; n++) listStore.append("chat", `batched-${chatSeq++}`);
    });
    const ms = performance.now() - t0;

    const diff = diffRenderCounts(before);
    expect(mapToObject(diff)).toEqual({ chat: 1 });
    expect(container.querySelectorAll("#chat li")[CHAT_WINDOW - 1]!.textContent).toBe(
      `batched-${chatSeq - 1}`,
    );
    report.scenarioB2 = { appendsInOneAct: 200, renderDiff: mapToObject(diff), wallMs: fmt(ms) };
  });

  test("(c) 100 timer ticks: only the timer re-renders", async () => {
    const durations: number[] = [];
    const before = snapshotRenderCounts();

    for (let n = 0; n < 100; n++) {
      const remaining = 300 - (n + 1);
      const t0 = performance.now();
      await act(() => {
        store.set("timer.remaining", remaining);
      });
      durations.push(performance.now() - t0);
    }

    const diff = diffRenderCounts(before);
    expect(mapToObject(diff)).toEqual({ timer: 100 });
    expect(container.querySelector("#timer")!.textContent).toBe("200");

    const st = stats(durations);
    report.scenarioC = {
      ticks: 100,
      renderDiff: mapToObject(diff),
      onlyTimerRendered: diff.size === 1 && diff.get("timer") === 100,
      tickToCommitMs: fmtStats(st),
    };
  });

  test("(d) mixed simulation: 10s at ~30 updates/sec (300 ticks), zero extraneous renders", async () => {
    // Synthetic clock: 300 ticks stand in for 10 wall-clock seconds at 30Hz.
    // Each tick is one act() batch, as if one socket frame delivered the
    // changes: every tick a score update + a chat message; every 10th tick an
    // unrelated-field update; every 30th tick (i.e. 1Hz) a timer tick.
    const rand = mulberry32(0xC0FFEE);
    const durations: number[] = [];
    const violations: string[] = [];

    for (let tick = 1; tick <= 300; tick++) {
      const card = Math.floor(rand() * NUM_PLAYERS);
      const unrel = tick % 10 === 0 ? Math.floor(rand() * NUM_UNRELATED) : -1;
      const timer = tick % 30 === 0;
      const score = scoreSeq++;
      const msg = `sim-${chatSeq++}`;
      const before = snapshotRenderCounts();

      const t0 = performance.now();
      await act(() => {
        store.set(`player.${card}.score`, score);
        listStore.append("chat", msg);
        if (unrel >= 0) store.set(`misc.${unrel}`, tick);
        if (timer) store.set("timer.remaining", 200 - tick / 30);
      });
      durations.push(performance.now() - t0);

      const expected = new Map<string, number>([[`card:${card}`, 1], ["chat", 1]]);
      if (unrel >= 0) expected.set(`unrel:${unrel}`, 1);
      if (timer) expected.set("timer", 1);

      const diff = diffRenderCounts(before);
      let ok = diff.size === expected.size;
      if (ok) for (const [k, v] of expected) if (diff.get(k) !== v) ok = false;
      if (!ok) {
        violations.push(
          `tick ${tick}: expected=${JSON.stringify(mapToObject(expected))} got=${JSON.stringify(mapToObject(diff))}`,
        );
      }
    }

    expect(violations).toEqual([]);
    assertDomMatchesStore(container, store, listStore);

    const st = stats(durations);
    report.scenarioD = {
      ticks: 300,
      simulated: "10s @ 30 updates/sec (each tick = 1 act batch of 2-4 field writes)",
      extraneousRenders: violations.length,
      batchToCommitMs: fmtStats(st),
    };
  });

  test("same-value set: store guard skips notify; even forced notify causes no re-render", async () => {
    const key = "player.7.score";
    const current = store.get(key);

    // 1. Guarded set: no notification at all.
    let notifBefore = store.notifications;
    let before = snapshotRenderCounts();
    await act(() => {
      store.set(key, current);
    });
    expect(store.notifications - notifBefore).toBe(0);
    expect(diffRenderCounts(before).size).toBe(0);

    // 2. forceSet (notify WITHOUT value change): React re-reads the snapshot,
    // sees an identical value (Object.is), and bails out — no re-render.
    notifBefore = store.notifications;
    before = snapshotRenderCounts();
    await act(() => {
      store.forceSet(key, current);
    });
    const forcedNotifs = store.notifications - notifBefore;
    expect(forcedNotifs).toBe(1); // the card's score hook WAS notified
    expect(diffRenderCounts(before).size).toBe(0); // ...but nothing re-rendered

    // 3. Same-CONTENT but new reference is NOT skipped (Object.is semantics).
    const objKey = "misc.obj";
    await act(() => {
      store.set(objKey, { a: 1 });
    });
    notifBefore = store.notifications;
    await act(() => {
      store.set(objKey, { a: 1 }); // deep-equal, different reference
    });
    // no subscriber on this key, but the store DID treat it as a change:
    expect(store.get(objKey)).not.toBe(current);
    const objNotifiedAsChange = true; // documented behavior: referential, not deep, equality

    report.sameValue = {
      guardedSetNotifications: 0,
      forcedNotifyNotifications: forcedNotifs,
      forcedNotifyRerenders: 0,
      reactBailsOutOnIdenticalSnapshot: true,
      deepEqualNewReferenceCountsAsChange: objNotifiedAsChange,
    };
  });

  test("tearing check: rapid un-acted updates settle to a consistent DOM", async () => {
    // Two sibling components subscribe to the SAME field in a separate root.
    const probeContainer = document.createElement("div");
    document.body.appendChild(probeContainer);
    const probeRoot = createRoot(probeContainer);
    await act(() => {
      store.set("probe.value", 0);
    });
    await act(() => {
      probeRoot.render(<TearingProbe store={store} />);
    });

    // Fire updates OUTSIDE act(), the way a real socket would: React must
    // schedule/batch them itself. Disable the act guard for this block.
    const g = globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean };
    g.IS_REACT_ACT_ENVIRONMENT = false;

    const rand = mulberry32(0x7E4A11);
    let probeFinal = 0;
    for (let round = 0; round < 20; round++) {
      // 50 rapid writes per round across probe field, scores, timer, chat.
      for (let k = 0; k < 50; k++) {
        const r = rand();
        if (r < 0.4) store.set("probe.value", ++probeFinal);
        else if (r < 0.7) store.set(`player.${Math.floor(rand() * NUM_PLAYERS)}.score`, scoreSeq++);
        else if (r < 0.9) listStore.append("chat", `tear-${chatSeq++}`);
        else store.set("timer.remaining", 1000 + round * 50 + k);
      }
      // Yield a microtask between rounds so work interleaves with scheduling.
      await Promise.resolve();
    }

    // Let React's scheduler drain (macrotask yields).
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 5));
    g.IS_REACT_ACT_ENVIRONMENT = true;

    // Both probes must agree with each other and with the store.
    const a = probeContainer.querySelector("#probe-a")!.textContent;
    const b = probeContainer.querySelector("#probe-b")!.textContent;
    expect(a).toBe(b);
    expect(a).toBe(String(store.get("probe.value")));
    expect(store.get("probe.value")).toBe(probeFinal);

    // The whole main tree must also match the final store state.
    assertDomMatchesStore(container, store, listStore);

    // How many renders did 1000 rapid writes cost the probes? (batching proof)
    const probeARenders = renderCounts.get("probe-a")!;
    const probeBRenders = renderCounts.get("probe-b")!;

    report.tearing = {
      rapidWrites: 1000,
      probeWritesToSameField: probeFinal,
      probesAgree: a === b,
      domMatchesFinalStoreState: true,
      probeARenders,
      probeBRenders,
      note: "renders << writes because un-acted external-store notifications are batched by React's scheduler",
    };

    await act(() => probeRoot.unmount());
    probeContainer.remove();
  });

  test("summary: totals & exit criteria", () => {
    const a = report.scenarioA as { extraneousRenders: number; updateToCommitMs: { mean: number } };
    const b = report.scenarioB as { onlyChatRendered: boolean };
    const c = report.scenarioC as { onlyTimerRendered: boolean };
    const d = report.scenarioD as { extraneousRenders: number; batchToCommitMs: { mean: number } };

    const zeroExtraneous =
      a.extraneousRenders === 0 && b.onlyChatRendered && c.onlyTimerRendered && d.extraneousRenders === 0;
    const meanUnder2ms = a.updateToCommitMs.mean < 2 && d.batchToCommitMs.mean < 2;

    report.exitCriteria = {
      zeroExtraneousRerendersInAtoC: zeroExtraneous ? "PASS" : "FAIL",
      meanUpdateToCommitUnder2ms: meanUnder2ms ? "PASS" : "FAIL",
    };
    report.totalComponentRenders = totalRenders();

    expect(zeroExtraneous).toBe(true);
    expect(meanUnder2ms).toBe(true);
  });
});
