---
"@empirica/core": minor
---

Add `preferUnderassignedGames` and `neverOverbookGames` assignment options.

The default player assignement algorithm assigns randomly to all games in the
first batch that still has game that haven't started. This algorithm will
notably "overbook" games, meaning that it will assign more players than the
game can handle. This is useful to ensure that games start quickly, while
maintaining good randomization. When the game starts, the players that are not
ready yet (because they are still in the intro steps) are automatically
reassigned to other games, with the same treamtent, if available.

However, in some cases, you may want to avoid overbooking games, or prefer to
assign players to games that are underassigned. This is now possible with the
`preferUnderassignedGames` and `neverOverbookGames` options.

The `preferUnderassignedGames` option will try to assign players to games that
are underassigned, before assigning to games that are already full, resuming
the assignment process as usual if no underassigned games are available, in the
current batch (this option does not try to prefer games that are underassigned
across batches).

The `neverOverbookGames` option will never assign players to games that are
already full. This will push players into the next batches, if no games are
available in the current batch. If no games are available in the next batches,
the player will be sent to exit. This option is a bit more strict than
`preferUnderassignedGames` and it can result in longer waiting times for
players, and potentially game that never start if a player never finishes the
intro steps.

Given the radical nature of the `neverOverbookGames` option, it is recommended
to use `preferUnderassignedGames` option if you do not want the normal behavior
of the assignment algorithm. If you use a single batch,
`preferUnderassignedGames` should fill optimally.

Note that `neverOverbookGames` takes precedence over `preferUnderassignedGames`,
meaning that if both options are set to `true`, `preferUnderassignedGames` will
be ignored.

To apply these options, in `server/src/index.js`, you can add the following
options to the `Classic` function:

```js
ctx.register(
  Classic({
    preferUnderassignedGames: true,
  })
);
```

```js
ctx.register(
  Classic({
    neverOverbookGames: true,
  })
);
```
