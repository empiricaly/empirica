---
"@empirica/core": patch
---

Enforce a max duration for stages. It is set to 1 billion seconds (~31 years) in
order to safely stay under the max value of a Go time.Duration object. See #319
for details.
