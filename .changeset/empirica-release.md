---
"@empirica/core": patch
---

Empirica proxy download was using hard links and it could break upgrades. It now uses copy for safety.
That does mean we are using up more space on disk, but it remain relatively minimal all things
considered. We might want to look into pruning old versions at some point, but it does not seem
critical at the moment since empirica binaries are not that large.

We've also improved looking up the current project release version by looking for the .empirica
directory in parent directories. This is helpful in the case of export, which runs in subdirectory and
will not pick up the correct empirica version.
