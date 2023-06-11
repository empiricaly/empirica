---
"@empirica/core": patch
---

On a server restart (callbacks), we were not waiting for all the attributes to
be loaded on a scope before running callbacks. This could lead to errors when
trying to access attributes that were not yet loaded. Notably, the `on.once`
callbacks would run multiple times, instead of... once.

We also had a bug in the `on.once` callbacks, where we were not checking the
correct attribute key to see if the callback had already been run. (☉_☉)
