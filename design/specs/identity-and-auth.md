# Spec — Identity & auth (resolves A4)

Status: Draft for review. Backs [07](../07-api.md), [12](../12-integrations.md);
feeds gate `reentry` (flow spec §2.2) and protocol `hello` (wire spec §7).

## 1. Principles

Single server, single DB ⇒ **stateful opaque tokens, no JWT machinery**: 256-bit
random values, stored **hashed** (SHA-256) in the DB, instantly revocable by row
delete. No crypto key management, no clock-skew validity bugs, and withdrawal/
redaction can revoke everything a player holds in one transaction.

## 2. Player identity & sessions

- **Enrollment**: entry URL (`/join?...`) with recruitment params
  (`PROLIFIC_PID`, etc.). Server: match/create player by external identity
  ([02](../02-domain-model.md)) → mint **session token** → client stores it
  (localStorage, deployment-namespaced). Identity params are captured into
  `identities` and journaled; unknown visitors are refused unless intake is open.
- `sessions(token_hash, player_id, device_slot, created_at, last_used_at,
  expires_at)`. Default expiry: study window + 30 days (config).
- **Device slots**: default one (`main`); a second `hello` on the same slot
  `REPLACED`s the first (wire spec §2). Additional named slots exist for
  spectator/debug tooling, not participants, in v1.
- **Dev mode**: unauthenticated visits mint throwaway players freely
  (the "new participant" loop that v2's `participantKey` served); production
  requires intake + valid entry.

## 3. Magic links (re-entry, device switching)

One mechanism for wave re-entry (F20), "continue on another device", and recovery:

- `magic_links(token_hash, player_id, purpose, expires_at, used_at)` — single-use,
  TTL per purpose (wave re-entry: gate-configured; device transfer: 15 min).
- Delivery via effects (email / Prolific message / displayed QR for device switch).
- Exchange: `POST /api/session/claim {magicToken}` → new session token for that
  device; the link is consumed atomically (`used_at` set in the same txn).
  Links appear in URLs by necessity — hence single-use + immediate exchange +
  short TTL; the session token never appears in a URL.
- Claiming a link MAY revoke other sessions per purpose (device transfer does;
  wave re-entry doesn't).

## 4. Consent as identity state

Consent is recorded `(consent_version, at)` on the player (journaled). If a deploy
bumps the consent version, in-flight players hit an automatic re-consent step at
their next node boundary (engine-inserted, not experiment code); refusal routes to
the `withdrawn` exit path (which may `ctx.redact`). This closes the loop between
A4, A7, and the flow spec's versioning rules.

## 5. Admin & service auth

- **Admin (humans)**: username + password (argon2id), optional TOTP; session cookie
  (`SameSite=Strict`, `HttpOnly`, `Secure`) + header token for state-changing
  requests (CSRF). Sessions 12 h, sliding. Login rate-limited + journaled
  (success and failure).
- **Service (automation)**: PATs, hashed at rest, with **scopes**:
  `intake:read|write`, `allocations:write`, `players:read|write`, `export:read`,
  `commands:execute`, `webhooks:manage`. Least-privilege by default (a posting bot
  gets `intake:write` only). Every service command journals the PAT's label as
  actor.
- No OAuth/SSO in v1 (single-lab deployments); the admin table is small and local.
  Revisit only with a managed platform.

## 6. Lifecycle & revocation

| Credential | TTL default | Revoked by |
|---|---|---|
| Player session | study + 30 d | withdrawal/redaction, admin kick, device transfer |
| Magic link | purpose-specific | single use, TTL, superseding link |
| Admin session | 12 h sliding | logout, password change |
| PAT | until revoked | admin UI |

`ctx.redact(player)` (05) additionally deletes all their live credentials in the
same transaction — a withdrawn participant's links stop working at commit.

## 7. Conformance hooks

- Token fuzz: malformed/expired/replayed tokens → `AUTH` bye / 401, never a crash;
  hashes only in DB dumps (test greps for raw tokens).
- Magic-link race: two concurrent claims → exactly one succeeds.
- Re-consent drill: consent bump mid-simulation inserts the step for in-flight
  players at the next boundary; refusal exits via `withdrawn` with redaction.
- Scope matrix: every service route × every scope → allow/deny as declared.
- REPLACED drill: second device claims transfer link → first socket byes, second
  resumes via cursor.

## Open sub-questions

1. Participant-facing "resume by email code" without researcher involvement
   (self-service recovery) — nice for longitudinal; proposal: opt-in per deployment,
   only when an email identity exists. → 12.
2. Admin roles (viewer vs operator vs owner) — v1 ships single role + PAT scopes;
   revisit with multi-operator labs. → A8/10.
