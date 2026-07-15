// S6 spike test, scenario (d) literal form: a mixed 10-second simulation at
// ~30 updates/sec (300 synthetic ticks), where each tick is ONE act() batch —
// the shape of one incoming websocket frame. Asserts the EXACT set of
// components that re-rendered on every tick (zero extraneous renders), and
// times each batch update->commit.
//
// Run: node test/mixed-sim-30hz.test.ts   (Node 22 native type stripping)
// Complements test/render-counts.test.ts, which drives each update in its own
// act() and covers scenarios (a)-(g).

import jsdomPkg from 'jsdom';
const { JSDOM } = jsdomPkg;

// ---- DOM globals BEFORE react-dom touches them -----------------------------
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const ReactPkg = (await import('react')).default;
const ReactDOMClientPkg = (await import('react-dom/client')).default;
const { createFieldStore, useField, useList } = await import('../src/field-store.ts');

const { createElement: h, Fragment, act } = ReactPkg;
const { createRoot } = ReactDOMClientPkg;

// ---- tiny assertion harness -------------------------------------------------
const failures: string[] = [];
function check(name: string, cond: boolean, detail: string): void {
  const line = `${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`;
  console.log(line);
  if (!cond) failures.push(line);
}

// ---- render counting ----------------------------------------------------------
const renderCounts = new Map<string, number>();
function bump(id: string): void {
  renderCounts.set(id, (renderCounts.get(id) ?? 0) + 1);
}
/** Exact delta of render counts since `before`; '' when it equals `expected`. */
function deltaDiff(before: Map<string, number>, expected: Record<string, number>): string {
  const problems: string[] = [];
  const delta = new Map<string, number>();
  for (const [k, v] of renderCounts) {
    const d = v - (before.get(k) ?? 0);
    if (d !== 0) delta.set(k, d);
  }
  for (const [k, v] of Object.entries(expected)) {
    if (delta.get(k) !== v) problems.push(`${k}: expected +${v}, got +${delta.get(k) ?? 0}`);
  }
  for (const k of delta.keys()) {
    if (!(k in expected)) problems.push(`extraneous render of ${k}: +${delta.get(k)}`);
  }
  return problems.slice(0, 8).join('; ');
}

// ---- stats ---------------------------------------------------------------------
function stats(xs: number[]): { n: number; mean: number; p50: number; p95: number; max: number } {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const q = (p: number) => s[Math.min(n - 1, Math.ceil(p * n) - 1)];
  return { n, mean, p50: q(0.5), p95: q(0.95), max: s[n - 1] };
}
const ms = (x: number) => `${x.toFixed(3)}ms`;

// ---- seeded PRNG (mulberry32) ----------------------------------------------------
let seed = 0xE5EED;
function rnd(): number {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---- store + tree (same shape as render-counts.test.ts) ---------------------------
const store = createFieldStore();
const N_PLAYERS = 100;
const N_UNRELATED = 100;

for (let i = 0; i < N_PLAYERS; i++) {
  store.set(`p${i}.name`, `player-${i}`);
  store.set(`p${i}.score`, 0);
  store.set(`p${i}.connected`, true);
}
store.set('timer', 600);
for (let i = 0; i < N_UNRELATED; i++) store.set(`u${i}.x`, 0);
for (let i = 0; i < 60; i++) store.append('chat', `seed-${i}`); // window (last 50) already sliding

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
  return h('div', { id: 'chat' }, msgs.slice(-50).join(','));
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

const root = createRoot(document.getElementById('root')!);
act(() => { root.render(h(App)); });

// =============================================================================
// (d) 10 seconds @ 30 updates/sec = 300 ticks. Per tick (one act() batch,
// i.e. one socket frame):
//   - every tick:      1 random player score update  (30/s)
//   - every tick:      1 chat append                 (30/s)
//   - every 10th tick: 1 unrelated-field update      (3/s)
//   - every 30th tick: 1 timer tick                  (1/s)
// Expected per-tick renders: exactly {cardX:1, chat:1 [, unrelatedY:1][, timer:1]}
// =============================================================================
const TICKS = 300;
const times: number[] = [];
const violations: string[] = [];
let counter = 2_000_000; // monotonic values -> every set() is a real change
let chatSeq = 60;
let fieldWrites = 0;

for (let tick = 1; tick <= TICKS; tick++) {
  const card = Math.floor(rnd() * N_PLAYERS);
  const unrel = tick % 10 === 0 ? Math.floor(rnd() * N_UNRELATED) : -1;
  const doTimer = tick % 30 === 0;
  const score = ++counter;
  const msg = `sim-${chatSeq++}`;
  const before = new Map(renderCounts);

  const t0 = performance.now();
  act(() => {
    store.set(`p${card}.score`, score);
    store.append('chat', msg);
    if (unrel >= 0) store.set(`u${unrel}.x`, ++counter);
    if (doTimer) store.set('timer', 600 - tick / 30);
  });
  times.push(performance.now() - t0);
  fieldWrites += 2 + (unrel >= 0 ? 1 : 0) + (doTimer ? 1 : 0);

  const expected: Record<string, number> = { [`card${card}`]: 1, chat: 1 };
  if (unrel >= 0) expected[`unrelated${unrel}`] = 1;
  if (doTimer) expected.timer = 1;
  const diff = deltaDiff(before, expected);
  if (diff !== '') violations.push(`tick ${tick}: ${diff}`);

  // spot-check the committed DOM for the updated card
  const want = `${store.get(`p${card}.name`)}|${score}|${(store.get(`p${card}.connected`) as boolean) ? 'on' : 'off'}`;
  if (document.getElementById(`card-${card}`)!.textContent !== want) {
    violations.push(`tick ${tick}: DOM stale for card${card}`);
  }
}

check('(d/30Hz) 300 ticks (10s @ 30/s): exact per-tick render set, 0 extraneous',
  violations.length === 0,
  `${TICKS} ticks, ${fieldWrites} field writes -> violations=${violations.length}${violations.length ? ' | ' + violations.slice(0, 3).join(' | ') : ''}`);

// full-tree DOM sweep vs final store state
{
  let mismatches = 0;
  for (let i = 0; i < N_PLAYERS; i++) {
    const want = `${store.get(`p${i}.name`)}|${store.get(`p${i}.score`)}|${(store.get(`p${i}.connected`) as boolean) ? 'on' : 'off'}`;
    if (document.getElementById(`card-${i}`)!.textContent !== want) mismatches++;
  }
  for (let i = 0; i < N_UNRELATED; i++) {
    if (document.getElementById(`unrelated-${i}`)!.textContent !== String(store.get(`u${i}.x`))) mismatches++;
  }
  const chatOk = document.getElementById('chat')!.textContent ===
    (store.getList('chat') as readonly string[]).slice(-50).join(',');
  const timerOk = document.getElementById('timer')!.textContent === String(store.get('timer'));
  check('(d/30Hz) final DOM sweep matches store', mismatches === 0 && chatOk && timerOk,
    `mismatched nodes=${mismatches}/200, chat ok=${chatOk}, timer ok=${timerOk}`);
}

const st = stats(times);
console.log(`      (d/30Hz) batch->commit per tick: n=${st.n} mean=${ms(st.mean)} p50=${ms(st.p50)} p95=${ms(st.p95)} max=${ms(st.max)} | total sim wall=${ms(times.reduce((a, b) => a + b, 0))} (vs 10,000ms of simulated time)`);
check('(d/30Hz) EXIT: mean batch->commit < 2ms', st.mean < 2,
  `mean=${ms(st.mean)} p95=${ms(st.p95)} (jsdom + React dev build — indicative only)`);

console.log('---');
if (failures.length === 0) {
  console.log('RESULT (mixed-sim-30hz): ALL CHECKS PASSED');
} else {
  console.log(`RESULT (mixed-sim-30hz): ${failures.length} FAILURE(S)`);
  process.exitCode = 1;
}
