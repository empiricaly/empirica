---
"@empirica/core": patch
---

Falsey values were casted to null on `.set()` since the addition of `.append()`.
