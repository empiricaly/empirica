---
"@empirica/core": patch
---

This fixes a bug where the stage starting callbacks could go out of order and
cause the game to lock up. This would only manifest itself when new stages were
added in the previous stage's `onEnd` callback. This fix improves event ordering
overall.
