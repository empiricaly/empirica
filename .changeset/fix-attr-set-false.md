---
"@empirica/core": patch
---

Fix a bug where setting an attribute to `false` on the server, after it was
initially set to true on the client, would not work as expected.
