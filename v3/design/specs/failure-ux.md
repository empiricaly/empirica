# Spec — Participant failure & edge-state UX (resolves A6)

Status: Frozen (2026-07-15). Backs [08](../08-client.md), [10](../10-admin.md).
Principle: **no improvised screens** — every terminal state is a declared exit path
with a stock screen; every transient state has a stock component; all overridable in
the template, none inventable ad hoc.

## 1. Transient states (stock components, auto-wired)

| State | Trigger | Default UX |
|---|---|---|
| Connecting / reconnecting | socket down, retrying with backoff + cursor | spinner after 2 s, "reconnecting" after 5 s; nothing before 2 s (avoid flicker — a v2 complaint) |
| Server restarting | same as reconnect (cursor makes it seamless) | same component; no special copy |
| Paused | admin pause (flow spec §6) | banner: "The researcher has paused the session — timers are stopped." |
| Waiting at barrier | submitted, others pending | "Waiting for others (2/4)" — counts by default, never names/status of *who* (§3) |
| Peer disconnect grace | dropout grace running | banner with countdown *if* policy says the group should know (§3); otherwise nothing |
| Task pending | group/player at a `task` node | node-titled progress screen ("Computing results…") |
| Lobby / gate wait | match pool / gate schedule | stock Lobby (pool progress) / Gate ("Wave 2 opens {date}" from gate metadata) |
| Stale protocol | `bye{UPGRADE}` (dev only; prod can't drift) | "Update available — reload." |
| Opened elsewhere | `bye{REPLACED}` | "This session is open in another tab/device — Continue here" (claims the slot back) |

## 2. Terminal states (exit-path screens)

Every route lands on the stock Exit screen rendering, from the exit-path declaration:
what happened (path-specific copy), **truthful payment status** (ledger total so far),
and the completion code with a copy button (+ auto-redirect for Prolific-style
`completionUrl` config). Path-specific default copy ships for: `finished`,
`screened*` ("the study is not a match — you'll be paid for your time"),
`lobbyTimeout`, `gameAborted` ("a technical/participant issue ended the session —
you'll be paid as described"), `disconnected`, `standbyReleased`, `withdrawn`
(confirms deletion per A7). Experiments override copy per path; they cannot remove
the code or the payment line — those are structural (anti-dark-pattern stance,
[00](../00-vision.md)).

## 3. Transparency defaults (what peers learn about each other)

- Barrier progress: **counts only** by default; `showWho: true` opt-in per phase.
- Disconnections: co-members see the grace countdown only when the dropout policy
  affects them (`pause`/`continue`/`replace` visible; silent for solo impact).
  Names are whatever the experiment exposes as visible fields — the engine never
  leaks identity on its own.
- Standbys waiting (A12): hold screen with truthful pay note; they never see game
  content unless promoted.

## 4. Client fault handling

- React error boundary at the app root: journals a `clientError` command (message,
  componentStack hash, bundle hash — no PII), shows "Something went wrong — Reload";
  state is server-side, so reload is always safe. Repeated crash-loop (3× in 60 s) →
  shows the support/contact line from deployment config.
- Command rejections surface per [08](../08-client.md): optimistic rollback + typed
  error to the calling code; *unhandled* rejections toast generically in dev and are
  silent-but-journaled in prod (never expose `STALE_RUN` internals to participants).
- Clock: countdowns always from `serverNow()`; if offset confidence is low
  (RTT jitter), timers render with ±, never freeze.

## 5. Admin visibility

Every transient state in §1 is a queryable player condition (`stuck at barrier 190 s`,
`reconnecting 40 s`, `crash-looped`) feeding the session-health signal (A8) and the
pipeline view ([10](../10-admin.md)). The operator sees the same taxonomy this spec
defines — one vocabulary end to end.

## 6. Conformance hooks

- Simulation drills for each row of §1/§2 (disconnect injection, pause, task delay,
  REPLACED, abort) asserting the declared component mounts and the copy source.
- Leak check: barrier/disconnect UI for player A contains no non-visible fields of
  player B (wire-level assertion, extends 06's suite).
- Exit screens always render a code and ledger line for every declared path in the
  reference experiments.

## Resolved sub-questions (freeze sweep, 2026-07-15)

1. **Offline input handling** (D23): during a disconnect the client queues
   **latest-value-per-field** for `writable('self')` sets (bounded by the field
   count; flushed on resume; rejections then surface normally). **Commands never
   queue** — they fail fast with a visible error, because replaying a stale `bid`
   or `accept` after reconnect is exactly the wrong semantics (STALE_RUN exists for
   a reason). Unsent-input loss on hard navigation is documented, not hidden.
2. Accessibility/i18n of stock copy: resolved by A10
   ([i18n-and-a11y](i18n-and-a11y.md) — ICU catalog covers all §1/§2 copy).
