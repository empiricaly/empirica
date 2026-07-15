# Package spec — @empirica/admin

Status: Ready for review. The operator UI: a privileged client-core consumer
rendering the flow algebra, never experiment-specific code (10).

## 1. Public surface

A static SPA served by the server at `/admin` (embedded in the bundle). No public
JS API; its *contract* is: renders any frozen-spec-conformant deployment with zero
experiment-specific code.

## 2. Behavioral requirements

BR1 pipeline view from the compiled flow: live per-node counts, canonical widget
per node type (step/gate/match/phase/task) ← 10. BR2 entity tables generated from
schema + `.label/.showInAdmin` metadata only ← 10. BR3 interventions, each an
audited command: timer extend/pause/resume, gate release, matcher nudge, standby
promote, kick/route, message, intake open/pause/close, allocation advance/cancel,
effect retry/abandon, group force-end ← 10. BR4 session health: incident list +
banner from the observability conditions; log tail view ← observability §3, freeze
sweep. BR5 ledger review surface: player × credits × flags; approve → payout batch;
budget view + cap state ← payment §2/§4. BR6 replay/spectate pane: mounts the
experiment client bundle against the replay transport; scrubber (inverse-backward
+ keyframes); spectate = head; admin-gated; respects redaction ← 09, S4. BR7 admin
connections use the same wire protocol with admin-scoped views; every admin action
journaled with actor ← 10, auth §5. BR8 allocation/intake controls ← 02/03. BR9
i18n/a11y baseline applies (operator-facing too) ← i18n.

## 3. Suites owned

operator drills (scripted UI flows over simulated sessions) · admin renders
V1–V3 with zero custom code · replay-pane state-equality spot checks ←
conformance index.

## 4. Non-goals

No experiment authoring (no treatment editors that write code — v2's trap). No
multi-deployment fleet view (post-v1, above the engine). No public embedding.
