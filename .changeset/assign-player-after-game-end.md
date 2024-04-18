---
"@empirica/core": patch
---

Fix reassign Player to a new Game after they played and finished a first Game.

There were 2 problems:

- the `player.get("ended")` field was not cleared
- the reassignment would not trigger the game to start if the introDone was not
  reset (you don't want the player to go through intro steps again), since we
  would never get the introDone signal, and just sit there...
