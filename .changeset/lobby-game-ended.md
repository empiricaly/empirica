---
"@empirica/core": patch
---

Fix ended games accepting players.

This fixes a bug where ended games were still accepting players. Specifically,
this happened when a lobby timed out, in which case the game was ended before
it had started, and the player assignment code was only checking whether games
had not started, not whether they had ended.
