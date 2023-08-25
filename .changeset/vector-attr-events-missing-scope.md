---
"@empirica/core": patch
---

Fix missing scope in vector attribute callbacks.

E.g.: In `Empirica.on("stage", "chat", (ctx, { stage, chat }) => {`, where
"chat" is a vector attribute, `stage` was undefined.
