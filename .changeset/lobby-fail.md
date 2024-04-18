---
"@empirica/core": patch
---

Fix lobby fail strategy and similar straight to exit steps cases.

There was a check for the presence of the `player.game` object in front of the
exit steps. If the game never starts, the `player.game` object is never
created, and the exit steps are never executed. This also addresses the case
where the player is never assigned a game at all (custom assignment).
