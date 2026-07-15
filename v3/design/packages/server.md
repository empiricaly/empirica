# Package spec — @empirica/server

Status: Ready for review. The transport shell around the engine: sockets, HTTP,
auth, the effects runner, and operational surfaces. Owns everything the engine's
non-goals exclude.

## 1. Public surface

```ts
createServer(experiment: Experiment, cfg: ServerConfig): EmpiricaServer
interface ServerConfig {
  dbPath: string; seed: string; port?: number;
  secrets: Record<string, string>;       // validated against bundle manifest at boot
  payment?, intake?, auth?, locale?, ... // deployment config per frozen specs
}
interface EmpiricaServer { listen(): void; stop(): Promise<void>; engine: Engine }
```

Internals are not exported; the CLI embeds this package. Effect *runners* register
via `experiment.effects` declarations (engine validates; server executes).

## 2. Behavioral requirements

**Transport** — BR1 WS endpoint + framing, message set, caps, chunked snapshots
← wire §1–2. BR2 command queue feeding `engine.dispatch` strictly in arrival order
per connection; acks relayed with commit seq ← wire §5, engine BR2. BR3 cursor
resume incl. restore-epoch rule and snapshot fallback ← wire §4 (S3). BR4 rate
limits as `BUDGET_EXCEEDED` rejects; send-queue cap → `SLOW_CONSUMER` bye; per-
player command-id LRU ← wire §5. BR5 clock sync fields in welcome/pong ← wire §6.
BR6 fanout: one `server.publish` per audience-class frame from `onPatchBatch`
(Bun topics; seam impl for Node) ← 06, S1.

**REST mirror** — BR7 `POST /api/commands/:name`, `GET /api/view`, session claim/
refresh routes; identical validation path; generated OpenAPI from command/query
schemas ← 07. BR8 outbound webhooks with signatures + retries ← 07.

**Auth** — BR9 enrollment, opaque hashed session tokens, device slots + REPLACED,
magic-link claim (atomic single-use), dev-mode throwaway players ← auth §2–3.
BR10 admin auth (argon2id, TOTP optional, CSRF-hardened cookies) + scoped PATs;
every admin/service command journaled with actor ← auth §5. BR11 re-consent
insertion on consent-version bump ← auth §4. BR12 redaction hook: revoke
credentials in the redaction transaction ← redaction §1.

**Operations** — BR13 checkpointer worker calling `engine.checkpoint()` at the
S1 cadence ← 05. BR14 effects runner: executes `EffectRequest`s with retries/
backoff/concurrency limits/dead-letter; results re-dispatched; idempotent across
restart ← 04. BR15 `/metrics`, structured logs with the keys-not-values rule
enforced at the serializer, health tick → conditions → banner/webhook ← observability.
BR16 boot report emitted and journaled; refuses boot on manifest-secret mismatch
← observability §4, 11.

## 3. Suites owned

resume · protocol (goldens, fuzz) · chaos (socket half) · privacy (wire half) ·
auth-matrix · health-drills ← conformance index.

## 4. Non-goals

No experiment semantics (engine). No UI. No file exports (cli). No TLS/domains
(the host's job; documented in deploy runbooks).

## 5. Notes (non-binding)

Bun.serve first with the seam kept satisfiable by S7's node impl; the S1/S7 spike
servers are the reference shapes for queue + fanout + checkpointer wiring.
