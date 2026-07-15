# Spec — Versioning & upgrades (resolves A11)

Status: Draft for review. Consolidates the compatibility contract referenced by
[11](../11-packaging-and-deploy.md), flow spec §7, schema spec §9, A4 §4.

## 1. The version tuple (what exists, where stamped)

| Version | Granularity | Stamped |
|---|---|---|
| Engine semver | release | bundle manifest; boot report; journal events |
| Protocol major | wire | `hello`/`welcome` (wire spec §8) |
| **Data-format version** | DB layout | DB header row at creation |
| Schema hash | experiment state shape | journal + export codebook (schema spec §9) |
| Flow structure hash | compiled flow | journal; deploy comparison (flow spec §7) |
| Bundle hash | exact build | every journal event; replay selects by it |

## 2. Rules

1. **A sealed bundle pins its engine.** There is no "upgrade the engine under a
   running study": same-engine bundles may hot-swap (subject to flow/schema rules
   below); an engine change mid-study is refused, full stop. New engine = new
   deployment (or explicit finalize-and-migrate, rule 3).
2. **Boot never migrates.** Engine refuses a *newer*-format DB (message: use a newer
   engine). Older-format DB → boot refuses with instructions; migration only via
   explicit `empirica migrate` which (a) requires a verified backup first (S3
   runbook), (b) is journaled, (c) is one-way.
3. **Mid-study deploy matrix** (same engine): flow-structure comparison per flow
   spec §7 (unchanged nodes with live runs, else `--finalize-inflight <exit>`);
   schema per schema spec §9 (additive yes; destructive refused; widening visibility
   = destructive); consent version bump → engine-inserted re-consent (A4 §4).
   Anything refused prints exactly which node/field/rule blocked it.
4. **Export reads everything.** `empirica export` on engine N MUST read every
   data-format version ≥ 1. Conformance: golden fixture DBs from each released
   format, exported and byte-compared each CI run. Old studies stay analyzable
   forever without old binaries (the v2 "tajriba.json invalid after upgrade" failure,
   inverted into a guarantee).
5. **Public API deprecation**: semver; deprecated surface keeps working for ≥ 2
   minor releases with boot-report warnings; `llms.txt` + generated docs regenerate
   every release so the LLM-facing surface is never stale (a deprecation that LLMs
   keep writing is a deprecation that failed — measure via template lint).
6. **v2 → v3**: one-way importer, `tajriba.json` → v3 export shape only (analysis
   continuity, not live migration). No API shims — concepts map in the migration
   guide, code is rewritten (by LLMs, per [00](../00-vision.md)).

## 3. Conformance hooks

- Format-fixture export matrix (rule 4) in CI from the first release.
- Deploy-matrix drill: each cell of rule 3 exercised in simulation (already seeded
  by flow/schema conformance lists; this spec adds the refusal-message golden).
- Downgrade drill: newer-format DB + older engine → clean refusal, no writes.
- Hot-swap drill: same-engine bundle with additive schema over a live simulated
  study → zero dropped connections (cursor resume), new fields live.

## Open sub-questions

1. LTS cadence — decide at first release; proposal: LTS = what the managed platform
   (future) runs, community picks their own risk otherwise.
