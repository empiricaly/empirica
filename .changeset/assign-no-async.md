---
"@empirica/core": patch
---

Add a flush after dynamic player assignment. This catches cases where
`assignPlayer()` is called without `await`.
