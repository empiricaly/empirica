---
"@empirica/core": patch
---

Ensure game and players are ready in exit steps.

The presence of the game and players were not checked in the exit steps, as they
are during the game. This could lead to the game or players not being available
in the exit steps callback (to select the steps) or the exit steps themselves.
