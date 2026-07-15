# Spec — Observability (resolves A8)

Status: Draft for review. Backs [10](../10-admin.md), [15](../15-development-plan.md).
Principle: **the operator learns about problems before participants complain**, and
logs/metrics never contain participant content (field keys yes, values never).

## 1. Structured logs

JSONL to stdout (12-factor; adapters/hosts collect), ring-buffer file in production
bundles (`.empirica/logs/`, size-capped). Every line:
`{ts, level, cat, msg, seq?, actor?, ...cat-fields}`.

Categories: `command` (name, actor type, latency ms, outcome incl. rejection code),
`hook` (node, hook, duration — warn at the 5 ms budget, error at ceiling),
`effect` (type, key, attempt, outcome, latency), `conn` (open/close/resume, cursor
age, REPLACED/SLOW_CONSUMER), `match` (node, pool size, decisions summary, or
UNSATISFIABLE detail), `timer` (armed/fired/drift ms), `admin` (every intervention —
mirrors the journal), `boot` (§4). Log level per category via config.

**Content rule (enforced, not aspirational):** log serializers accept entity ids,
field *keys*, codes, and numbers; passing a field *value* is a type error in engine
code and stripped at runtime for user-code log calls (`ctx.log` redacts non-scalar
args by default).

## 2. Metrics

`GET /metrics` (Prometheus text; admin/service auth). Core series:

- `command_latency_ms` histogram (by class), `command_queue_depth`,
  `commands_total{outcome}`
- `connected_clients`, `patches_sent_total`, `send_queue_bytes` (max/conn),
  `resumes_total{mode}`
- `effect_queue_depth{type}`, `effects_dead_letter_total` — dead letters also alert
- `timer_drift_ms` (fired-at minus due-at, p99), `hook_duration_ms` histogram
- `db_bytes`, `journal_seq`, `wal_bytes`, litestream lag (scraped from its metrics
  if enabled — S3's runbook)
- per-node occupancy gauges (`flow_node_units{node}`) — the pipeline view's data,
  exported

## 3. Session health (derived conditions → one signal)

Evaluated in-engine on a 10 s tick, each condition journaled on entry/exit so replay
shows what the operator saw:

| Condition | Default trigger |
|---|---|
| `stuck_barrier` | barrier unsatisfied > 2× stage duration with all members connected |
| `matcher_starved` | pool ≥ min group size, no formation for 5 min |
| `effect_dead` | any dead-lettered effect |
| `crash_loop` | player error-boundary 3× / 60 s (failure-UX §4) |
| `reconnect_storm` | > 20% of connected clients resumed within 60 s |
| `clock_skew` | timer drift p99 > 500 ms |
| `disk_pressure` | db+wal growth projecting full disk < 48 h |
| `backup_lag` | litestream lag > 5 min |

Surfacing: admin banner + filterable incident list ([10](../10-admin.md)); optional
webhook (`health.changed`) and email/push via effects — a babysitting researcher gets
paged, doesn't watch a dashboard.

## 4. Boot report

On start, one structured block (and pretty-printed to TTY): bundle hash, schema hash,
engine version, flow summary (node count per type + compiled segment map), declared
exits × pay coverage (A5's boot rule results), config summary with secrets elided,
DB state (seq, players, live groups), pending effects/timers re-armed, warnings
(unreachable exits, missing indexes). The boot report is journaled — forensics can
prove what configuration a session ran under (complements the bundle hash).

## 5. Error tracking (optional adapter)

Sentry (or compatible) adapter, off by default: server exceptions and client
error-boundary reports (already content-free per failure-UX §4), tagged with bundle
hash + seq. The PII scrub is ours, not Sentry's: same serializer rule as §1.

## 6. Conformance hooks

- Content-rule test: fuzz `ctx.log`/error paths with participant-like values in
  simulation → grep emitted logs for any field value from the session (extends the
  06 leak suite to logs).
- Health drills: each §3 condition induced in simulation → condition fires, journals,
  clears; webhook fixture receives transitions.
- Metrics presence test: every series in §2 present after a reference-experiment run.
- Boot report golden file per reference experiment.

## Open sub-questions

1. OpenTelemetry traces (per-command spans) — valuable for effect-heavy studies;
   proposal: defer, design the log `cat` fields to be OTel-mappable later.
2. Admin log-viewer in v1 vs "use the host's" — proposal: minimal tail view behind
   admin auth; full search stays host-side.
