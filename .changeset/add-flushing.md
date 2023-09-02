---
"@empirica/core": minor
---

Added the ability to manually flush changes outside of callback functions with
`Empirica.flush(): Promise<void>`. This is useful when you want to make changes
asynchronously without blocking the callback. For example, if you want to
call an external API and update an attribute with the results, but your don't
want to block the callback while waiting for the API to respond.

`Empirica.flush()` will return a promise that resolves when the changes have
been flushed. You can use `await Empirica.flush()` to wait for the changes to be
flushed. But you do not have to wait for the flush. It is only useful if you
have multiple flushes in a single function, where you want to commit the changes
in steps.

The simplest example:

```js
Empirica.on("stage", "myTrigger", (ctx, { stage, myTrigger }) => {
  callMyAPI.then((value) => {
    stage.set("value", value);
    Empirica.flush();
  });
});
```

An example with different use cases:

```js
Empirica.on("stage", "myTrigger", (ctx, { stage, myTrigger }) => {
  // Copying the stage to the global namespace so we can use it outside of the
  // callback function. See below this callback function.
  myStage = stage;

  // flush
  setTimeout(() => {
    stage.set("b", (stage.get("b") || 0) + 1);
    Empirica.flush();
  }, 2000);
});

// Note: copying a stage to the global namaspace like this is not recommended,
// this is just for illustration purposes. If you have multiple games running
// at the same time, stages will overwrite each other.
let myStage;
setInterval(() => {
  if (myStage) {
    myStage.set("c", (myStage.get("c") || 0) + 1);
    Empirica.flush();
  }
}, 1000);
```

Note: if you perform blocking operations between changes, the changes
before the blocking operations **might** be flushed before flushing manually.
The change log is global, so while you're blocking, other changes might happen
in a callback elsewhere, and that could trigger a flush of all latent changes.
If you want to make a set of changes atomic, you should not do any blocking
operations between them (i.e. use `await` or Promises).

If you are starting an interval (`setInterval`), you should make sure to
clear it properly. Here's an example with an interval per game:

```js
const timers = {};

// We use the game event to start the interval. this ensures that the interval
// is started on a server restart.
Empirica.on("game", (ctx, { game }) => {
  if (!game.isRunning) return;

  timers[game.id] ||= setInterval(() => {
    // do something
    Empirica.flush();
  }, 1000);
});

Empirica.onGameEnd(({ game }) => {
  clearInterval(timers[game.id]);
});
```

Or have a single interval that manages all games:

```js
const activeGames = new Set();

// We use the game event to start the interval. this ensures that the interval
// is started on a server restart.
Empirica.on("game", (ctx, { game }) => {
  if (game.isRunning) {
    activeGames.add(game);
  }
});

setInterval(() => {
  for (const game of activeGames) {
    // do something
  }
  Empirica.flush();
}, 1000);

Empirica.onGameEnd(({ game }) => {
  activeGames.delete(game.id);
});
```
