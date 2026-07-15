# Spec — i18n & accessibility baseline (resolves A10)

Status: Draft for review. Scope: **stock components and engine-emitted copy only** —
experiment content is authored directly in the researcher's language(s); we impose no
catalog on their code.

## 1. i18n mechanism

- All stock strings (consent chrome, lobby, gate, hold, exit screens, error banners,
  chat UI, validation messages surfaced to participants) live in an ICU MessageFormat
  catalog. Deployment config: `locale` (default `en`) + `messages` override map
  (partial overrides fine — labs commonly reword, not retranslate).
- Ship `en` maintained in-repo; other locales via community PRs with a completeness
  check in CI (missing key → falls back to `en`, logged once).
- Dates/times/durations through `Intl` with the deployment timezone: scheduled gates
  ("wave 2 opens …") always render in the *participant's* local time **with** a tz
  label; countdown durations are locale-formatted.
- RTL: stock components use logical CSS properties; `dir` flows from locale config.
- Engine rejection messages shown to participants are catalog keys, not raw codes
  (failure-UX §4 already requires this).

## 2. Accessibility baseline (WCAG 2.1 AA targets, stock components)

- Full keyboard operability; visible focus; **focus management on step/stage
  transitions** (heading focus, announced).
- Timers: `aria-live` announcements at thresholds (60/30/10 s), never per-tick;
  turn changes and barrier releases announced politely.
- Forms: real labels, error association (`aria-describedby`), no color-only state.
- Contrast tokens ≥ AA in the default theme; `prefers-reduced-motion` respected
  (no essential information in animation).
- Chat: log role, new-message announcement throttled.

CI: axe-core pass over every stock component story and the reference experiments'
stock screens; violations fail the build.

## 3. Placeholder-content guard (the Napoleon-quiz rule)

v2 shipped hardcoded demo consent/quiz/survey text that reached production studies.
Templates here ship placeholder content carrying a build-visible marker;
`empirica build` **warns loudly** for any placeholder still byte-identical to the
scaffold (checksum), and `--strict` (default in `deploy`) refuses. Researchers can
suppress per-file with an explicit `// empirica:placeholder-ok` (journaled in the
boot report).

## 4. Conformance hooks

- Catalog completeness + fallback logging test.
- axe-core suite as above; keyboard-only simulation drill through V1's full flow.
- tz snapshot tests for gate copy across 3 locales/timezones.
- Placeholder guard: scaffold → build warns; edited → silent; suppressed → boot
  report line.
