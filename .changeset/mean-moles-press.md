---
"@empirica/core": minor
---

#213: Disable auto end batch

By default if all existing games are complete, the batch ends. 
This option disables this pattern so that we can leave a batch open indefinitely. 
It enables spawning new games for people who arrive later, even if all previous games have been already finished.

The change adds a `disableBatchAutoend` param in the server configuration.

In order to use the feature, set the `disableBatchAutoend` option to true in `<your-experiment>/server/src/index.js`, e.g.
```js
  ctx.register(Classic({
    disableBatchAutoend: true
  }));
```