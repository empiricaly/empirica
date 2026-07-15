// S6 spike test: render-count exactness + timing for the per-field store.
// Run: node test/render-counts.test.ts   (Node 22 native type stripping)
//
// jsdom + react-dom/client createRoot + React.act. All timings are jsdom /
// dev-build numbers — indicative only, not browser-representative.

import jsdomPkg from 'jsdom';
const { JSDOM } = jsdomPkg;

// ---- DOM globals BEFORE react-dom touches them -----------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div><div id="aux"></div></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const ReactPkg = (await import('react')).default;
const ReactDOMClientPkg = (await import('react-dom/client')).default;
const { createFieldStore, useField, useList } = await import('../src/field-store.ts');

const { createElement: h, Fragment, act } = ReactPkg;
const { createRoot } = ReactDOMClientPkg;

// ---- tiny assertion harness ------------------------------------------------
const failures: string[] = [];
function check(name: string, cond: boolean, detail: string): void {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`;
  console.log(line);
  if (!cond) failures.push(line);
}

// ---- render counting ---------------------------------------------------------
const renderCounts = new Map<string, number>();
function bump(id: string): void {
  renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
}
function resetCounts(): void {
  renderCounts.clear();
}
function totalRenders(): number {
  let t = 0;
  for (const v of renderCounts.values()) t += v;
  return t;
}
/** '' if counts match `expected` exactly (no extra keys, no missing keys). */
function diffCounts(expected: Record<string, number>): string {
  const problems: string[] = [];
  for (const [k, v] of Object.entries(expected)) {
    const got = renderCounts.get(k) ?? 0;
    if (got !== v) problems.push(`${k}: expected ${v}, got ${got}`);
  }
  for (const k of renderCounts.keys()) {
    if (!(k in expected)) problems.push(`extraneous render of ${k}: ${renderCounts.get(k)}`);
  }
  return problems.slice(0, 8).join('; ');
}

// ---- stats -------------------------------------------------------------------
function stats(xs: number[]): { n: number; mean: number; p50: number; p95: number; max: number } {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const q = (p: number) => s[Math.min(n - 1, Math.ceil(p * n) - 1)];
  return { n, mean, p50: q(0.5), p95: q(0.95), max: s[n - 1] };
}
const ms = (x: number) => `${x.toFixed(3)}ms`;
function fmt(label: string, xs: number[]): string {
  const st = stats(xs);
  return `${label}: n=${st.n} mean=${ms(st.mean)} p50=${ms(st.p50)} p95=${ms(st.p95)} max=${ms(st.max)}`;
}

// ---- store + components -------------------------------------------------------
const store = createFieldStore();

const N_PLAYERS = 100;
const N_UNRELATED = 100;

for (let i = 0; i < N_PLAYERS; i++) {
  store.set(`p${i}.name`, `player-${i}`);
  store.set(`p${i}.score`, 0);
  store.set(`p${i}.connected`, true);
}
store.set('timer', 0);
for (let i = 0; i < N_UNRELATED; i++) store.set(`u${i}.x`, 0);

function PlayerCard({ i }: { i: number }) {
  const name = useField(store, `p${i}.name`) as string;
  const score = useField(store, `p${i}.score`) as number;
  const connected = useField(store, `p${i}.connected`) as boolean;
  bump(`card${i}`);
  return h('div', { id: `card-${i}` }, `${name}|${score}|${connected ? 'on' : 'off'}`);
}

function ChatPane() {
  const msgs = useList(store, 'chat') as readonly string[];
  bump('chat');
  const last50 = msgs.slice(-50);
  return h('div', { id: 'chat' }, last50.join(','));
}

function Timer() {
  const t = useField(store, 'timer') as number;
  bump('timer');
  return h('div', { id: 'timer' }, String(t));
}

function Unrelated({ i }: { i: number }) {
  const x = useField(store, `u${i}.x`) as number;
  bump(`unrelated${i}`);
  return h('div', { id: `unrelated-${i}` }, String(x));
}

function App() {
  const kids: any[] = [];
  for (let i = 0; i < N_PLAYERS; i++) kids.push(h(PlayerCard, { key: `c${i}`, i }));
  kids.push(h(ChatPane, { key: 'chat' }));
  kids.push(h(Timer, { key: 'timer' }));
  for (let i = 0; i < N_UNRELATED; i++) kids.push(h(Unrelated, { key: `u${i}`, i }));
  return h(Fragment, null, ...kids);
}

// ---- mount ---------------------------------------------------------------------
const t0mount = performance.now();
const root = createRoot(document.getElementById('root')!);
act(() => {
  root.render(h(App));
});
const mountMs = performance.now() - t0mount;

const N_COMPONENTS = N_PLAYERS + N_UNRELATED + 2;
check('mount', totalRenders() === N_COMPONENTS,
  `total initial renders=${totalRenders()} (expected ${N_COMPONENTS}), mount wall=${ms(mountMs)}, live subscriptions=${store.subscriberCount()}`);

// =============================================================================
// (a) 200 single-field score updates -> exactly 1 card re-render each, 0 others
// =============================================================================
resetCounts();
{
  const times: number[] = [];
  let deltaViolations = 0;
  const tBatch0 = performance.now();
  for (let k = 0; k < 200; k++) {
    const i = k % N_PLAYERS;
    const before = totalRenders();
    const t0 = performance.now();
    act(() => {
      store.set(`p${i}.score`, k + 1);
    });
    times.push(performance.now() - t0);
    if (totalRenders() - before !== 1) deltaViolations++;
  }
  const wall = performance.now() - tBatch0;

  const expected: Record<string, number> = {};
  for (let i = 0; i < N_PLAYERS; i++) expected[`card${i}`] = 2; // 200 updates / 100 cards
  const diff = diffCounts(expected);
  check('(a) score updates: exact renders', diff === '' && deltaViolations === 0,
    `200 updates -> ${totalRenders()} renders (each card exactly 2), per-update-delta violations=${deltaViolations}${diff ? ' | ' + diff : ''}`);
  console.log('      ' + fmt('(a) update->commit', times) + ` | wall for 200 act() calls=${ms(wall)}`);
  (globalThis as any).__timesA = times;
}

// =============================================================================
// (b) 200 chat appends
//   b1: burst inside ONE act -> React batches: ChatPane renders exactly once
//   b2: 200 appends in separate act calls -> ChatPane renders exactly 200 times
// =============================================================================
resetCounts();
{
  const t0 = performance.now();
  act(() => {
    for (let n = 0; n < 200; n++) store.append('chat', `m${n}`);
  });
  const wall = performance.now() - t0;
  const diff = diffCounts({ chat: 1 });
  check('(b1) chat burst (1 act): only ChatPane, batched to 1 render', diff === '',
    `200 appends -> renders: chat=${renderCounts.get('chat') ?? 0}, everyone else=0, wall=${ms(wall)}${diff ? ' | ' + diff : ''}`);
}
resetCounts();
{
  const times: number[] = [];
  const t0 = performance.now();
  for (let n = 0; n < 200; n++) {
    const s = performance.now();
    act(() => {
      store.append('chat', `n${n}`);
    });
    times.push(performance.now() - s);
  }
  const wall = performance.now() - t0;
  const diff = diffCounts({ chat: 200 });
  check('(b2) chat appends (200 acts): only ChatPane, 1 render each', diff === '',
    `200 appends -> renders: chat=${renderCounts.get('chat') ?? 0}, everyone else=0${diff ? ' | ' + diff : ''}`);
  console.log('      ' + fmt('(b2) append->commit', times) + ` | wall=${ms(wall)}`);
  (globalThis as any).__timesB = times;
}

// =============================================================================
// (c) 100 timer ticks -> only Timer
// =============================================================================
resetCounts();
{
  const times: number[] = [];
  for (let n = 0; n < 100; n++) {
    const s = performance.now();
    act(() => {
      store.set('timer', (store.get('timer') as number) + 1);
    });
    times.push(performance.now() - s);
  }
  const diff = diffCounts({ timer: 100 });
  check('(c) timer ticks: only Timer renders', diff === '',
    `100 ticks -> renders: timer=${renderCounts.get('timer') ?? 0}, everyone else=0${diff ? ' | ' + diff : ''}`);
  console.log('      ' + fmt('(c) tick->commit', times));
  (globalThis as any).__timesC = times;
}

// =============================================================================
// (d) mixed randomized 1000-update run (seeded) — each update in its own act.
// total renders must equal total updates hitting subscribed fields, +0 extra.
// "ghost" updates hit keys nobody subscribes to -> must cause 0 renders.
// =============================================================================
resetCounts();
{
  // mulberry32, fixed seed for reproducibility
  let seed = 0xC0FFEE;
  function rnd(): number {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const expected: Record<string, number> = {};
  const bumpExpected = (k: string) => { expected[k] = (expected[k] ?? 0) + 1; };
  let counter = 1_000_000; // monotonic -> every set() is a real change
  let subscribedUpdates = 0;
  let ghostUpdates = 0;
  const times: number[] = [];

  const t0 = performance.now();
  for (let n = 0; n < 1000; n++) {
    const r = rnd();
    const i = Math.floor(rnd() * N_PLAYERS);
    counter++;
    const s = performance.now();
    if (r < 0.25) {
      act(() => { store.set(`p${i}.score`, counter); });
      bumpExpected(`card${i}`); subscribedUpdates++;
    } else if (r < 0.35) {
      act(() => { store.set(`p${i}.name`, `nm-${counter}`); });
      bumpExpected(`card${i}`); subscribedUpdates++;
    } else if (r < 0.45) {
      act(() => { store.set(`p${i}.connected`, !(store.get(`p${i}.connected`) as boolean)); });
      bumpExpected(`card${i}`); subscribedUpdates++;
    } else if (r < 0.60) {
      act(() => { store.set('timer', counter); });
      bumpExpected('timer'); subscribedUpdates++;
    } else if (r < 0.75) {
      act(() => { store.set(`u${i}.x`, counter); });
      bumpExpected(`unrelated${i}`); subscribedUpdates++;
    } else if (r < 0.90) {
      act(() => { store.append('chat', `d${counter}`); });
      bumpExpected('chat'); subscribedUpdates++;
    } else {
      // no component subscribes to ghost keys
      act(() => { store.set(`ghost${n % 10}`, counter); });
      ghostUpdates++;
    }
    times.push(performance.now() - s);
  }
  const wall = performance.now() - t0;

  const diff = diffCounts(expected);
  check('(d) mixed 1000 updates: renders == subscribed updates, 0 extraneous', diff === '' && totalRenders() === subscribedUpdates,
    `${subscribedUpdates} subscribed + ${ghostUpdates} ghost updates -> ${totalRenders()} renders${diff ? ' | ' + diff : ''}`);
  console.log('      ' + fmt('(d) update->commit', times) + ` | wall for 1000 act() calls=${ms(wall)}`);
  (globalThis as any).__timesD = times;
}

// =============================================================================
// (e) set() to the SAME value -> 0 re-renders
// =============================================================================
resetCounts();
{
  // e1: primitive, same value (store bails via Object.is)
  act(() => { store.set('p0.score', store.get('p0.score')); });
  const e1 = totalRenders();
  check('(e1) same primitive value: 0 renders', e1 === 0, `renders=${e1}`);

  // e2: notify() with UNCHANGED snapshot — bypasses the store's Object.is
  // bailout; React itself must bail because getSnapshot returns identical ref.
  resetCounts();
  act(() => { store.notify('p0.score'); });
  const e2 = totalRenders();
  check('(e2) notify without change: React bails on identical snapshot', e2 === 0, `renders=${e2}`);

  // e3: object value — set the SAME reference twice -> second is a no-op
  resetCounts();
  const obj = { hp: 10, mana: 4 };
  act(() => { store.set('u0.x', obj); });
  const afterFirst = totalRenders(); // 1 (0 -> obj is a change)
  act(() => { store.set('u0.x', obj); });
  const afterSecond = totalRenders();
  check('(e3) same object reference: 0 extra renders', afterFirst === 1 && afterSecond === 1,
    `first set renders=${afterFirst}, same-ref set adds=${afterSecond - afterFirst}`);

  // e4: deep-equal but NEW object -> re-renders. This is the reference-equality
  // contract: the store (and React) compare by identity, not structure.
  resetCounts();
  act(() => { store.set('u0.x', { ...obj }); });
  const e4 = totalRenders();
  check('(e4) deep-equal NEW object: exactly 1 render (identity, not structure)', e4 === 1, `renders=${e4}`);

  act(() => { store.set('u0.x', 0); }); // restore for later DOM sweep
}

// =============================================================================
// (f) tearing check: rapid interleaved updates in one act, then flush;
// DOM text must match final store state.
// =============================================================================
resetCounts();
{
  act(() => {
    store.set('p5.score', 111);
    store.append('chat', 'f-one');
    store.set('timer', 5001);
    store.set('p5.score', 222);
    store.set('p7.name', 'zeta');
    store.append('chat', 'f-two');
    store.set('timer', 5002);
    store.set('p5.score', 999);   // final value for p5.score
    store.append('chat', 'f-three');
  });

  const card5 = document.getElementById('card-5')!.textContent;
  const card7 = document.getElementById('card-7')!.textContent;
  const timerText = document.getElementById('timer')!.textContent;
  const chatText = document.getElementById('chat')!.textContent;

  const wantCard5 = `${store.get('p5.name')}|${store.get('p5.score')}|${(store.get('p5.connected') as boolean) ? 'on' : 'off'}`;
  const wantCard7 = `${store.get('p7.name')}|${store.get('p7.score')}|${(store.get('p7.connected') as boolean) ? 'on' : 'off'}`;
  const wantChat = (store.getList('chat') as readonly string[]).slice(-50).join(',');

  const domOk = card5 === wantCard5 && card7 === wantCard7 && timerText === '5002' && chatText === wantChat;
  const diff = diffCounts({ card5: 1, card7: 1, timer: 1, chat: 1 });
  check('(f) interleaved updates: DOM == final store state (no tearing)', domOk,
    `card5="${card5}" want "${wantCard5}"; timer=${timerText}; chat tail ok=${chatText === wantChat}`);
  check('(f) interleaved updates: batched to 1 render per touched component', diff === '',
    `renders: card5=${renderCounts.get('card5')}, card7=${renderCounts.get('card7')}, timer=${renderCounts.get('timer')}, chat=${renderCounts.get('chat')}${diff ? ' | ' + diff : ''}`);
}

// Full-tree DOM vs store sweep (post-everything consistency)
{
  let mismatches = 0;
  for (let i = 0; i < N_PLAYERS; i++) {
    const want = `${store.get(`p${i}.name`)}|${store.get(`p${i}.score`)}|${(store.get(`p${i}.connected`) as boolean) ? 'on' : 'off'}`;
    if (document.getElementById(`card-${i}`)!.textContent !== want) mismatches++;
  }
  for (let i = 0; i < N_UNRELATED; i++) {
    if (document.getElementById(`unrelated-${i}`)!.textContent !== String(store.get(`u${i}.x`))) mismatches++;
  }
  check('(f+) full-tree DOM sweep matches store', mismatches === 0, `mismatched nodes=${mismatches}/200`);
}

// =============================================================================
// (g) gotcha demo: getSnapshot that returns a fresh array per call -> React dev
// detects unstable snapshot and errors. Informative, not an exit criterion.
// =============================================================================
{
  function BadList() {
    // BAD: new array identity on every getSnapshot call
    return h('div', null, String((ReactPkg.useSyncExternalStore(
      (cb: () => void) => store.subscribe('chat', cb),
      () => [...store.getList('chat')],
    ) as unknown[]).length));
  }
  let captured: unknown = null;
  const errSpy: string[] = [];
  const origErr = console.error;
  console.error = (...args: unknown[]) => { errSpy.push(args.map(String).join(' ')); };
  try {
    const auxRoot = createRoot(document.getElementById('aux')!, {
      onUncaughtError: (e: unknown) => { captured = e; },
    });
    act(() => { auxRoot.render(h(BadList)); });
    act(() => { auxRoot.unmount(); });
  } catch (e) {
    captured = e;
  } finally {
    console.error = origErr;
  }
  const all = [String((captured as Error | null)?.message ?? captured ?? ''), ...errSpy].join(' || ');
  const sawLoop = /Maximum update depth|getSnapshot should be cached|infinite loop/i.test(all);
  console.log(`INFO  (g) uncached getSnapshot behavior: ${sawLoop ? 'React errored as documented' : 'no error surfaced'} -> ${all.slice(0, 220) || '(silent)'}`);
}

// =============================================================================
// list append cost scaling (store-side only, no subscribers, no React)
// =============================================================================
{
  const s2 = createFieldStore();
  const bench = (k: number): number => {
    const key = `big${k}`;
    const t0 = performance.now();
    for (let n = 0; n < k; n++) s2.append(key, n);
    return performance.now() - t0;
  };
  const t5k = bench(5000);
  const t10k = bench(10000);
  const t20k = bench(20000);
  console.log(`INFO  list append cost (copy-on-append, no subscribers): 5k=${ms(t5k)}, 10k=${ms(t10k)}, 20k=${ms(t20k)} (ratio 20k/5k=${(t20k / t5k).toFixed(1)}x — quadratic, see README)`);
}

// =============================================================================
// exit criteria summary
// =============================================================================
{
  const all = [
    ...(globalThis as any).__timesA,
    ...(globalThis as any).__timesB,
    ...(globalThis as any).__timesC,
    ...(globalThis as any).__timesD,
  ] as number[];
  const st = stats(all);
  console.log('---');
  console.log(fmt('ALL single-update->commit (a+b2+c+d)', all));
  check('EXIT: mean update->commit < 2ms', st.mean < 2, `mean=${ms(st.mean)} p95=${ms(st.p95)} (jsdom + React dev build — indicative only)`);
  console.log('---');
  if (failures.length === 0) {
    console.log(`RESULT: ALL CHECKS PASSED (${N_COMPONENTS} components, ${store.subscriberCount()} live subscriptions)`);
  } else {
    console.log(`RESULT: ${failures.length} FAILURE(S)`);
    for (const f of failures) console.log('  ' + f);
    process.exitCode = 1;
  }
}
