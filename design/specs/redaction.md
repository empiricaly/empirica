# Spec — Withdrawal & redaction mechanics (resolves A7)

Status: Draft for review — **requires legal review before freeze** (flagged items ⚖).
Backs [05](../05-storage.md) (D14); ties into A4 (credential revocation), A5 (credits),
flow spec §5 (the `withdrawn` exit path), S4 (replay/keyframes), S5 (collab docs).

## 1. Triggers

- `ctx.redact(player)` from an exit path (`withdrawn`) — participant-initiated via the
  consent-promised URL (magic-link authenticated), or refusal at a re-consent step.
- Admin command `redact(player)` (journaled with operator identity).
- Service API (`players:write` scope) for GDPR-request tooling.

Redaction is **one transaction**: content tombstoned + credentials revoked + a
`redaction` journal event (requester, scope, content-hash of affected row set). It is
irreversible by construction — there is no "unredact".

## 2. What is destroyed vs preserved

Principle (D14): **destroy content, preserve structure.** Event counts, sequences,
timing, and group topology remain (the scientific record's shape and other
participants' data integrity); everything the player expressed is gone.

| Data | Action |
|---|---|
| `identities` rows (external IDs: Prolific PID, email…) | **deleted** — internal id becomes an unlinkable pseudonym ⚖ |
| `kv` values on the player / their memberships / their player×runs | tombstoned (`{"__redacted": true}`), `updated_seq` bumped → live viewers receive tombstone patches |
| `lists` entries they authored (chat…) | value tombstoned; pseudonymous actor id retained |
| `events.payload_json` where they are actor | tombstoned |
| `changes.old_json/new_json` for their entities | tombstoned |
| `effects` inputs/results tied to their runs (e.g. LLM prompts containing their text) | tombstoned |
| sessions, magic links | deleted (A4 §6) |
| credits | **preserved** — payment obligations stand; reasons are identifiers, never content (A5 §3) |
| snapshots/keyframes (S4) | dropped and rebuilt from the redacted journal |
| collab docs they co-authored | see §3 ⚖ |

Aggregates already computed from their data (group means, pot totals) are **not**
recomputed — they are facts about the session that other participants experienced.
⚖ Consent-template language must say so.

## 3. Collaborative documents ⚖

Yjs update streams interleave authors; excising one author's keystrokes without
rewriting shared history is not generally possible. Default position (wiki-practice
precedent): **collaborative artifacts are collective works** — the doc survives,
authorship metadata for the withdrawn player is removed, and the consent template
states this explicitly. Per-deployment strict mode (`redaction.collab: 'destroy'`)
tombstones entire docs the player touched (accepting co-author data loss). Legal
review decides the default's adequacy per jurisdiction.

## 4. Backups ⚖

Litestream generations contain pre-redaction bytes. On redaction the engine:
1. forces a new backup generation (post-redaction state), and
2. relies on the deployment's declared retention window (default 30 days) to age out
   prior generations — erasure is documented to complete when retention lapses.
The operator handbook and consent template both state the window.

## 5. Verification & audit

- `empirica verify-redaction <player>`: scans every table (and export views) for the
  tombstone invariant — no value bytes for the player, no external identities;
  emits a signed report (journaled) suitable for a GDPR-response file.
- Export after redaction: pseudonymous rows with tombstones, counts intact (05's
  acceptance test).
- Replay after redaction: structure replays; redacted payloads render as tombstone
  placeholders (09).

## 6. Conformance hooks

- Redaction drill in every reference experiment's simulation suite: withdraw one
  player mid-session → live co-players receive tombstone patches; verify-redaction
  passes; export golden updated; replay still completes; credits unchanged.
- Property: redaction event itself never contains content (only ids/hashes).
- Backup drill extension of S3: restore a pre-redaction generation after retention
  simulation → generation absent.

## Open sub-questions ⚖

1. Jurisdictional review of the pseudonymization stance (§2) and collective-work
   default (§3) — external counsel, before freeze.
2. Whether `verify-redaction` should also scan admin/ops logs (A8 says logs carry
   keys, never values — verify that claim in the drill).
