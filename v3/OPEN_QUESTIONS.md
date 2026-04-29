# Open Questions

Things explicitly deferred so we don't pretend they're decided. Resolve each
in a dedicated PR with a follow-up note here.

- **Postgres backend.** SQLite-only for v3. Re-evaluate when someone has a real
  multi-process need we can't meet with replication.
- **Stage timer precision.** Currently planning ±100 ms tolerance via the
  injected Clock. Confirm against worst-case browser RTT before locking it in.
- **Replay semantics.** Event log makes replay possible, but we haven't
  defined whether replay re-runs callbacks or just rehydrates state. Lean
  rehydrate-only.
- **Mobile UX.** Many studies use mobile participants. The admin UI is
  desktop-first; the player SDK should not assume desktop. Player templates
  should be mobile-friendly by default.
- **Audit trail vs. event log.** The `events` table covers state mutations.
  Admin actions (e.g., "kicked player X") may want a separate `audit` log so
  retention/PII rules can differ. Decide before shipping admin actions.
- **Defer vs. await.** We chose `defer()` for slow async; revisit if real
  callbacks feel awkward writing it. Property: never silently await user
  promises during hot paths.
- **JWT verifier discovery.** Should the dev provider mint Firebase-shaped
  JWTs so dev/prod are byte-identical, or a custom shape with a `dev:` issuer?
  Lean custom shape — clearer in logs.
- **OpenAPI schema source.** Generate from Zod via `@asteasolutions/zod-to-openapi`,
  or hand-write? Lean Zod-derived to avoid drift.
- **Hot reload mode.** Dev: full restart on callback file change vs. attempt
  in-place reimport. Lean full restart; stale closures cause subtle bugs.
