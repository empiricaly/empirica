# Package spec — @empirica/react

Status: Ready for review. Thin React 19 bindings over client-core plus the stock
components the failure-UX and i18n specs demand. Deliberately small: sugar beyond
this lives visibly in templates (D7).

## 1. Public surface

Hooks (frozen list ← naming spec): `usePlayer`, `useNode`, `useGroup(kind?)`,
`usePeers(kind?)`, `useGlobals`, `useCommand(name)`, `useConnection`.

Provider: `<EmpiricaProvider url token?>` (token auto-resolves via enrollment/
localStorage when omitted — dev mode included).

Stock components (surface names bound here; copy from the i18n catalog only):
`<ConsentGate>` `<LobbyScreen>` `<GateScreen>` `<HoldScreen>` (standby)
`<ExitScreen>` `<ConnectingScreen>` `<PausedBanner>` `<BarrierWait>` `<Timer>`
`<Chat>` `<ReplacedScreen>` `<ErrorBoundary>` — one per failure-UX §1/§2 row —
plus `<StageFrame>` (renders current stage children with submit/retract wired).

## 2. Behavioral requirements

BR1 hooks are `useSyncExternalStore` bindings over client-core per-field
subscriptions; render-granularity guarantees ← 08 (S6). BR2 every transient/
terminal state row renders its declared stock component with catalog copy;
overrides per component prop, never removable code+payment lines on `<ExitScreen>`
← failure-ux §1–2. BR3 `<Timer>` renders from `serverNow()` with low-confidence ±
← failure-ux §4. BR4 `<ErrorBoundary>` journals content-free `clientError`,
crash-loop shows support line ← failure-ux §4. BR5 a11y baseline on every stock
component (axe CI, focus management on node transitions, timer aria thresholds)
← i18n §2. BR6 i18n: all copy via the ICU catalog, RTL-safe, tz-labeled gate copy
← i18n §1. BR7 barrier transparency defaults (counts, `showWho` opt-in) ←
failure-ux §3. BR8 `<Chat>` binds a list field with rate-coalesced typing via an
ephemeral field ← 08.

## 3. Suites owned

render (component half) · a11y · failure-drill component assertions · i18n
snapshots ← conformance index.

## 4. Non-goals

No flow logic, no lifecycle orchestration components (v2's `EmpiricaContext`
mega-component is exactly what D7 abolishes — the template composes screens from
`useNode()`), no styling system beyond neutral tokens.
