# Spec — Naming freeze (resolves A9)

Status: Draft for review. The canonical glossary for every public name. After freeze,
docs, templates, error messages, and `llms.txt` MUST use these names exclusively
(CI lint: a dictionary check over docs/templates — synonyms are bugs).

## Principles (LLM-first ergonomics)

1. **One name per concept, no synonyms.** LLMs (and humans) pattern-match; "session"
   sometimes meaning group-run and sometimes auth-session is how bugs get written.
2. **Greppable**: prefer `defineExperiment` over `define`; distinctive over cute.
3. **Nouns for things, verbs for commands**; boolean fields read as predicates
   (`closed`, `dormant`); no abbreviations (`allocation`, not `alloc`); US spelling.
4. **No collisions** with dominant ecosystem names in the same file's typical import
   space (checked below).

## Canonical glossary

### Domain

| Name | Is | Not (banned synonyms) |
|---|---|---|
| **player** | the human participant entity | participant, subject, user |
| **group** (with **kind**, **membership**, **role**, **dormant**) | the sharing primitive | game*, room, team (as engine terms) |
| **flow** / **node** / **segment** | the program / its statements / a group's contiguous group-mode subtree | graph, journey, pipeline |
| **step / gate / match / phase / task** | the five node types | screen, barrier, lobby†, stage‡ |
| **stage** | a timed barrier unit *inside* a phase | — |
| **run** (with **cycle**, **iteration**) | one traversal instance of a node by a unit | instance, round-object |
| **treatment / factor** | standard experimental-design terms | condition (docs may explain with it, API never) |
| **allocation** | declarative recruitment target | batch |
| **intake** | the open/paused/closed switch + caps | recruitment (that's the activity, not the switch) |
| **enrollment** | a player's entry into the deployment | registration, signup |
| **exit path** (`exits:`) | declared terminal route with code + pay | outcome, ending |
| **credit / ledger** | payment accrual rows | payment-object, payout (payout = the submission act) |
| **command / query** | state change / read | action, mutation, event§ |
| **hook / effect** | sync in-txn callback / async post-commit work | callback, listener, job |
| **journal** (events + changes) | the append-only record | event log, history |
| **patch / cursor / view** | sync delta / resume position / entitlement set | diff, offset |
| **bundle / deployment** | sealed build artifact / a running instance+DB | build, app, instance |
| **standby** | dormant over-recruited member | backup, spare |

\* "game" survives only as the classic template's chosen group kind — userland
vocabulary, not engine vocabulary. † "lobby" likewise: the template's name for its
match node. ‡ "stage" is reserved for in-phase units, never a node type. § "event" is
reserved for journal rows.

### Code surfaces (frozen signatures live in their specs; names frozen here)

- **Experiment module**: `defineExperiment`, `defineSchema`, `field`, `list`,
  `record`, `field.collab`; `flow.seq`, `repeat`, `repeat.while`, `branch`;
  node constructors `step/gate/match/phase/stage/task`; policies `groups.fixedSize`,
  `groups.backfill`, `pairs`; constraints `byRole`, `noRepeat`, `roundRobin`,
  `randomPerfect`; strategies `balanced`, `stratified`, `sequence`; results
  `ok/retry/route/abort/reject`; helpers `usd`, `days`.
- **ctx**: `now`, `rng`, `at`, `effect`, `pay.credit`, `pay.void`, `redact`, `log`,
  `llm` (adapter). Handles: `get/set`, `group(kind)`, `members()`, `member()`,
  `subgroups(kind)`, `list(key)`, `run.player()`, `run.sibling(name)`, `run.phase`,
  `treatment`.
- **React**: `usePlayer`, `useNode`, `useGroup`, `usePeers`, `useGlobals`,
  `useCommand`, `useConnection`. (`usePeers`, not `usePlayers` — it returns
  *visible co-members*, and precision beats v2 muscle memory per D-log.)
- **CLI**: `create`, `dev`, `simulate`, `build`, `deploy`, `export`, `migrate`,
  `archive`, `verify-redaction`.
- **Wire** (`t:` values): `hello/welcome/snapshot/patch/command/ack/ping/pong/bye`.
- **Packages**: `@empirica/engine`, `server`, `client-core`, `react`, `cli`, `admin`.

## Collision check (deliberate calls)

- `match` — shadows nothing imported in experiment files; `String.prototype.match`
  is method-position only. OK.
- `task` — no dominant JS export collision; reads correctly in flow context. OK.
- `Effect` — we never export a class `Effect` (avoid effect-ts confusion); the
  API is `ctx.effect(...)` + `task(...)`. OK.
- `field` — collides with nothing dominant; `zod`'s `z` stays the validation
  namespace. OK.
- `run` — only as property/handle (`run.player()`), never a bare export. OK.
- `useNode` — react-flow exports a `useNodes`; ours is singular and app-scoped;
  acceptable, revisit only on real confusion evidence.

## Renames decided by this freeze (vs earlier drafts)

1. `usePeers` confirmed over `usePlayers` (precision; D7 keeps `usePlayers` available
   as visible template sugar for classic).
2. Journal tables stay `events`/`changes`; prose must say **journal**, never
   "event log" (banned-synonym lint).
3. `groups.fixedSize` confirmed over `fixedGroups` (policy namespace pattern:
   `groups.*` for pool matchers, bare `pairs` for submatch).
4. The five node types are final: `step/gate/match/phase/task` — no aliases.

## Conformance hooks

- Dictionary lint over docs/, templates, error-message catalog, and `llms.txt`:
  banned synonyms fail CI (allowlist for explanatory prose like "…(sometimes called
  a lobby)" in tutorials, marked inline).
- Public-API surface diff in CI: any new exported name requires a glossary entry
  (keeps the freeze honest as code lands).
