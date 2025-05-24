---
"@empirica/core": patch
---

Fix race condition in Stage.end() when timerID is null

Fixed a race condition bug where Stage.end() would crash with "Error caught in Stage.end: possibly from addTransitions() due to null timerID" when multiple players (10+) are playing simultaneously. The issue occurred when Stage.end() was called before the stage initialization finalizer completed, resulting in a null timerID being passed to addTransitions(). The fix adds proper null checking and graceful error handling, preventing premature game termination while maintaining normal functionality when timerID is available.

Fixes: https://github.com/empiricaly/empirica/issues/595 