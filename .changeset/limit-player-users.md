---
"@empirica/core": minor
---

Added the ability to limit the number of concurrent players and users that can
join a server. This can be useful when you want to run a study with a limited
number of participants, or when you want to limit the number of concurrent
participants to avoid overloading your server.

The 2 new flags are:

- `--tajriba.server.maxParticipants`: the maximum number of players that can
  join a server at once.
- `--tajriba.server.maxUsers`: the maximum number of users that can join a
  server at once.

There is limited support for these flags in the UI. The player will simply not
get passed the player registration form if the server is full. And the user will
not be able to login.
