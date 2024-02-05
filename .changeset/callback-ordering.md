---
"@empirica/core": patch
---

Improve callback ordering by only allowing 1 callback to run at a time. This is
change also make addScopes await for the scope changes to be added locally
before returning.
