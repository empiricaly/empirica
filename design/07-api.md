# 07 — API: commands, queries, REST + WS, SDKs

Status: Draft

## One model: commands and queries

Everything is a **command** (state change through the loop) or a **query** (read).
The WebSocket protocol ([06](06-sync-and-visibility.md)) is merely the streaming framing
of the same model; REST is the request/response framing. **There is no WS-only
capability** — external systems are never second-class.

```
POST /api/commands/:name        # same validation → auth → txn → journal path as WS
GET  /api/query/...             # view-filtered reads (participant) or admin reads
GET  /api/stream (WS upgrade)   # patches + acks
```

Command and query schemas are Zod; the OpenAPI spec is **generated, not maintained**.
Custom commands defined in `experiment.ts` ([04](04-engine.md#custom-commands)) appear in
the spec automatically — an experiment's control surface is self-documenting.

## Auth

- **Players**: signed tokens minted at enrollment; carried by WS hello and REST bearer.
  Multi-day re-entry via magic links (token embedded, single-use refresh) —
  [12-integrations.md](12-integrations.md) covers delivery.
- **Admin**: separate credential class, session-based for the UI, PATs for automation;
  every admin command journaled with actor identity. TOTP optional.
- **Service**: scoped PATs for external orchestration (a lab scheduler, a posting bot) —
  least-privilege scopes (`intake:write`, `export:read`, ...).

No open CORS, no unauthenticated config endpoints (both v2 defects).

## Outbound webhooks

Deployment-level subscriptions: `session.ended`, `group.formed`, `player.finished`,
`intake.exhausted`, `effect.dead_lettered`, ... with signed payloads and retries.
This is the other half of "external control": systems can *react* without polling.

## SDKs

1. **TypeScript** — falls out of the shared client core (same package the React bindings
   use); typed by the experiment schema.
2. **Python — prioritized second.** The language of the research community (the oTree
   world). The Python client speaks the participant protocol, so **Python-based bots and
   LLM agents join as participants** with zero framework cooperation — test harnesses,
   standby fill-ins, and LLM-subject studies from a notebook.
3. Everything else: the generated OpenAPI spec.

## Versioning

- Protocol version in `hello`/headers; engine follows semver; a deployment pins its
  engine via the sealed bundle ([11](11-packaging-and-deploy.md)).
- Experiment-level API (custom commands, fields) is versioned by bundle hash — clients
  and bundle are built together, so drift is impossible in production.

## Acceptance criteria

- Conformance: every reference-experiment action executable via REST alone (scripted
  session driver passes without a WS connection, minus real-time patches).
- Generated OpenAPI validates against recorded traffic from simulation runs.
- Fuzzing: malformed/oversized/replayed commands produce typed rejections, never
  engine faults; auth scopes enforced per route.
