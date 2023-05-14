---
"@empirica/core": patch
---

Fixed an issue where components passed into intro and exit steps that were using closure would hard reload when attributes were updated on game or player. Fixes #263.

