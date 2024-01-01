---
"@empirica/core": patch
---

Scoped objects should never be missing under EmpiricaContext. Some have reported
`player.stage` or `player.round` being undefined, for example. This fix also
more thoroughly checks that all expected objects (not only scoped objects) are
always present.
