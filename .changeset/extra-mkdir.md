---
"@empirica/core": patch
---

Remove extra directory creation in `empirica` command.

An extra directory was created if the path of the project contained spaces when
running the `empirica` command.
