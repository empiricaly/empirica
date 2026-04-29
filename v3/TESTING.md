# Testing

We optimise for tests we can rely on. The shape is a normal pyramid:

- **Tons of unit tests.** Every helper, every pure function, every state
  machine transition. Cheap, fast, exhaustive.
- **Lots of integration tests.** Real SQLite (`:memory:`), real Hono app via
  `app.fetch`, real WebSocket pairs, real callback runtime. We do not mock
  ourselves.
- **Good e2e coverage.** Playwright drives a real browser against a real
  server for the high-value flows: player joins → full game completes,
  admin creates a batch → game runs end-to-end, lobby timeout, reassignment,
  export.

## Tooling

- **Vitest** for unit and integration tests across every package.
- **Coverage** via `vitest --coverage` (v8 provider). Targets are advisory,
  not a gate; coverage that hides bad tests is worse than honest gaps.
- **Playwright** for browser e2e. Tests live in `e2e/` at the workspace root
  and run against a freshly built dev server in CI. Headed locally for
  debugging, headless in CI.

## File layout

- Unit tests sit next to the code they cover: `foo.ts` + `foo.test.ts`.
- Integration tests live in `packages/empirica/test/integration/`.
- Test helpers in `packages/empirica/src/testing/` (exported as
  `empirica/testing` for users who want to integration-test their own
  callbacks).

## What we test

| Surface              | Style                                                                 |
|----------------------|-----------------------------------------------------------------------|
| Pure helpers         | Plain unit tests, table-driven where it makes sense.                  |
| DB schema + queries  | Integration with a real `better-sqlite3` `:memory:` DB per test.      |
| Runtime / callbacks  | Integration: spin up the runtime in-process, call public APIs.        |
| Strategies           | Property tests for invariants (no double-assignment, no orphan players). |
| HTTP API             | Integration: hit the real Hono app via `app.fetch`.                   |
| WebSocket            | Integration: in-process WS pair, assert on the patch stream.          |
| React hooks          | `@testing-library/react` against a fake in-memory client.             |
| Admin UI screens     | Component tests; e2e for batch-create and live-inspector.             |
| Templates            | Smoke test: each template scaffolds, installs, type-checks, boots.    |

## Rules

1. **Don't mock what we own.** If we need to test against a DB, use the real
   one against `:memory:`. Mocking our own code makes the test useless when
   the real code drifts.
2. **Time is injected.** No test reads `Date.now()` or `setTimeout` directly.
   Runtime takes a `Clock` interface; tests pass a controllable fake.
3. **Async is bounded.** Every `await` in a test has a deadline. Tests that
   hang on broken code are bugs, not flakes.
4. **Shape over snapshot.** Prefer asserting structured values; use snapshots
   only for stable serialised forms (OpenAPI, schema dumps, exports).
5. **One concept per test name.** `describe('assignment.balanced', ...)
   it('prefers underbooked games when one exists', ...)`.
6. **Failing test before fix.** Bugs reproduce in a test before they're
   patched, even when the fix is one line.

## Running

```sh
pnpm test                  # full vitest suite, watch off
pnpm test:watch            # watch
pnpm test --coverage       # with coverage
pnpm -F empirica test       # just the runtime package
pnpm e2e                   # playwright e2e suite
pnpm e2e --headed          # playwright with visible browser
```

## Pyramid targets (rough)

| Layer       | Count goal                | Per-test budget |
|-------------|---------------------------|-----------------|
| Unit        | thousands; cover every branch of pure code | < 5 ms |
| Integration | hundreds; cover every public API surface   | < 200 ms |
| E2E         | dozens; cover every critical user journey  | < 30 s |
