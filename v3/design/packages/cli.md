# Package spec — @empirica/cli

Status: Ready for review. The developer/operator face: project lifecycle from
scaffold to archived study. Verbs frozen ← naming spec.

## 1. Public surface (commands)

```
empirica create <name>        # scaffold: experiment.ts, client/, config, sim tests
empirica dev                  # engine+server+client dev+admin, one process, HMR
empirica simulate [--players N --seed S --bots mix]   # sim harness CLI face
empirica build                # sealed bundle + manifest (hash, engine ver, secrets schema)
empirica deploy [fly|ssh|docker] [--ephemeral]
empirica export [--format sqlite|duckdb|csv] [--out]
empirica migrate              # explicit, backup-first, journaled (never on boot)
empirica archive              # snapshot DB to storage, verify export, teardown
empirica verify-redaction <player>
```

## 2. Behavioral requirements

BR1 `create`: thin project, sugar visible in-template, sim tests scaffolded with
real assertions ← 11. BR2 `dev`: single supervising process; boot report pretty-
printed; placeholder-content warnings live ← 11, i18n §3. BR3 `simulate`: exit
code reflects assertions; `--seed` reproduces byte-identically ← 09. BR4 `build`:
single-file executable via the S2 manifest-codegen pattern; manifest fields per
11; placeholder guard strict by default on `deploy` ← 11, S2, i18n §3. BR5
`deploy` adapters: fly (volume+Tigris+Litestream+secrets in one run), ssh/docker;
refuses without offsite backup unless `--no-backup` ← 11, S3 runbook. BR6
`export`: analysis-ready SQLite/DuckDB views + generated codebook from schema
(+CSV derived); byte-stable goldens; reads every data-format version ever
released ← 05, versioning §2.4. BR7 `migrate`: refusal matrix + backup-first ←
versioning §2.2–2.3. BR8 `archive`: snapshot, verify export integrity, teardown;
restore instructions printed ← 11. BR9 `verify-redaction`: full-store scan incl.
log ring buffer; signed journaled report ← redaction §5, D28. BR10 v2 importer:
`empirica import-v2 <tajriba.json>` → v3 export shape, one-way ← versioning §2.6.
BR11 generates `llms.txt` + OpenAPI + docs from source at release (M7 surface,
CLI owns the emitters).

## 3. Suites owned

export goldens + format-fixture matrix · migrate/deploy refusal matrices ·
placeholder guard · redaction scan · bundle boot drill (empty-dir run) · E2E
create→dev→build→deploy clean-machine drill ← conformance index.

## 4. Non-goals

No hosted services; adapters script hosts the user owns. No GUI. No experiment
authoring commands (authoring is code).
