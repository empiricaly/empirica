---
"@empirica/core": minor
---

Add ephemeral attribute support.

This allows you to define attributes that are not persisted to the database, but
are available to the client and server while the server is still running. These
attributes will sync with all players as normal attributes. This is useful for
data that that would be unreasonable to persist to the database due to size or
volatility, but is still useful to share between clients and the server.

For example, you could use this to sync the mouse movements of the players.

```js
player.set("mouse", { x: 123, y: 456 }, { ephemeral: true });
player.get("mouse"); // { x: 123, y: 456 }
```
