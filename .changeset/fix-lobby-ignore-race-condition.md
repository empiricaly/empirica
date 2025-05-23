---
"@empirica/core": patch
---

Fix lobby ignore configuration race condition causing infinite loading

Fixed an issue where the "ignore" lobby configuration strategy would cause infinite loading when the lobby timer expired while some players were still reading instructions. The issue occurred because players who hadn't completed the intro were not properly removed from the game before starting it, leading to an inconsistent game state.

The fix ensures that:
- Players who haven't completed the intro are properly exited and their gameID is set to null
- The game only starts if there are players who have completed the intro
- Removed players become eligible for reassignment to other games

Fixes https://github.com/empiricaly/empirica/issues/598 