---
"@empirica/core": minor
---

Attributes can be marked as private to the current player. This means that the
attribute will not be sent to other players. When used on the server (and thus
as a privileged user), private attributes will not be sent to any player. This
is useful for data that should only be visible to the current player or no
player at all.
  
```js
player.set("somethingPrivate", "hey", { private: true });
```js
