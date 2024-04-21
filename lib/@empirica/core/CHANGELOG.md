# @empirica/core

## 1.11.2

### Patch Changes

- 3123aed: Replaying with a different set of of players would fail to load the game state.

## 1.11.1

### Patch Changes

- 992d5f1: Fix reassign Player to a new Game after they played and finished a first Game.

  There were 2 problems:

  - the `player.get("ended")` field was not cleared
  - the reassignment would not trigger the game to start if the introDone was not
    reset (you don't want the player to go through intro steps again), since we
    would never get the introDone signal, and just sit there...

- 97c6837: Fix lobby fail strategy and similar straight to exit steps cases.

  There was a check for the presence of the `player.game` object in front of the
  exit steps. If the game never starts, the `player.game` object is never
  created, and the exit steps are never executed. This also addresses the case
  where the player is never assigned a game at all (custom assignment).

## 1.11.0

### Minor Changes

- efc0fd5: Export now supports passing a tajriba.json file as the first argument to export
  the data directly from a file instead of automatically detecting the file from
  the current project.

  ```sh
  # At the root of the project.
  empirica export

  # Anywhere, although it uses the global version of empirica (not the version
  # locked in your project). Upgrade to the latest version of empirica with:
  # `empirica upgrade --global`
  empirica export path/to/tajriba.json
  ```

## 1.10.0

### Minor Changes

- 2d4e245: Add ephemeral attribute support.

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

### Patch Changes

- 2d4e245: Ensure game and players are ready in exit steps.

  The presence of the game and players were not checked in the exit steps, as they
  are during the game. This could lead to the game or players not being available
  in the exit steps callback (to select the steps) or the exit steps themselves.

- 2d4e245: Make player reset in admin UI work again.

## 1.9.9

### Patch Changes

- 9197232: Attribute callbacks could be run out of order.

## 1.9.8

### Patch Changes

- 9e24313: Fix an issue with the shared/ignore lobby configuration, and more generally with
  a number of players in a game that is not equal to the `treatment.playerCount`.

## 1.9.7

### Patch Changes

- c8319ce: Fix a bug where setting an attribute to `false` on the server, after it was
  initially set to true on the client, would not work as expected.
- 144f928: Upgrade `empirica create` templates with updated packages and build tools

## 1.9.6

### Patch Changes

- 0c39a7c: New export to fix consistency and performance issues.

## 1.9.5

### Patch Changes

- e70565d: Fix broken export command.

## 1.9.4

### Patch Changes

- 40a5d5c: Improve callback ordering by only allowing 1 callback to run at a time. This is
  change also make addScopes await for the scope changes to be added locally
  before returning.
- 0994940: Enable `empirica serve` to run in the official Docker container image.
- aa7fd43: Log connection errors instead of throwing unhanded exceptions.
- 434e36a: Avoid blocking on concurrent release of step stopping timer.

## 1.9.3

### Patch Changes

- fba5e09: `empirica serve` now respects the version in the bundle.

## 1.9.2

### Patch Changes

- 6974fe8: Upgrade node build to 20.10.0.

## 1.9.1

### Patch Changes

- fe46f00: Export vector attributes to CSV as arrays.

## 1.9.0

### Minor Changes

- cd48506: `empirica export` could fail with a "Premature close" error (#474). This seems
  to be originating from a bug in the `node-fetch` package, which is used to
  polyfill `fetch` in Node.js. This upgrades Node.js to v20+, which includes
  native `fetch` support. We still have the `cross-fetch` polyfill for projects
  that have not updated to Node.js v20+ yet. Export uses a vendored project which
  has been updated to use the latest Node.js version, so it does not require the
  entire experiment to be updated for it to use Node.js v20+.

  See the following issues on `node-fetch` for more details:
  https://github.com/node-fetch/node-fetch/issues/1767
  https://github.com/node-fetch/node-fetch/issues/1576

### Patch Changes

- b32b95a: Scoped objects should never be missing under EmpiricaContext. Some have reported
  `player.stage` or `player.round` being undefined, for example. This fix also
  more thoroughly checks that all expected objects (not only scoped objects) are
  always present.

## 1.8.12

### Patch Changes

- c20ca73: Fix setting attributes with the same mutated object as the current one.

  For example, before this patch, the value would not be saved, since we are
  reusing the same object, which we've only mutated in place:

  ```js
  const value = player.get("myobject");
  value["mykey"] = "myvalue";
  player.set("myobject", value);
  ```

- d1816ad: Ensure `usePlayers` never returns undefined (expect in unmanaged games).

## 1.8.11

### Patch Changes

- a5ecdbd: Avoid re-setting a key to the same value from the client side. For example:

  ```js
  scope.set("key", "value");
  scope.set("key", "value"); // no-op
  ```

  This is not only for sets in the same tick as shown here, but also across ticks.

- a5ecdbd: Improve various concurrency issues.
- a5ecdbd: When <Steps> has no steps, only set the doneKey once.

## 1.8.10

### Patch Changes

- 98d72e9: Handle errors in step state transition requests.

## 1.8.9

### Patch Changes

- 282e6e6: Upgrade tajriba.js to v1.5.2.

## 1.8.8

### Patch Changes

- 44c9486: Upgrade tajriba.js to version 1.5.0.

## 1.8.7

### Patch Changes

- 3fe3191: Fix export version resolution logic.

## 1.8.6

### Patch Changes

- 685ceb4: Fix issue in Tajriba where the change queue could hit an out of bounds error.
- 685ceb4: Fix `Max payload size exceeded` error when exporting data.

## 1.8.5

### Patch Changes

- c3c1f2f: Reverting websocket changes back to empirica version 1.8.0.

## 1.8.4

### Patch Changes

- 0c8e8e0: Further improvements to websockets: we no longer kill the connection when the
  buffer runs out, instead of we block, as we used to. This is done so that
  exceptional spikes (initial loads) can be handled. A connection that does not
  manage to decrease the size of their buffer will be disconnected after 10
  seconds, so we shouldn't get blocked indefinitely if there is a bad conn.
  The assumption here is that initial loads are worse on the admin/server side,
  since it needs to load much larger amounts of data, and that the client will
  usually not reach the buffer limit. Meanwhile, the clients are usually the ones
  that have connection problems. So we want to disconnect them before they reach
  the buffer limit, but not disconnect the server-side while it is still loading
  initial data.

## 1.8.3

### Patch Changes

- 0d412f8: Add missing ids to export.

## 1.8.2

### Patch Changes

- 6ee08a3: Improvements to websocket buffering:
  - increased buffer size
  - added a check to close the connection if the buffer keeps increasing in size
    for 10s straight.

## 1.8.1

### Patch Changes

- ec62b7a: Make the websocket connection non-blocking. This fixes issues where a zombie
  websocket connection (not disconnected, but not keeping up with the messages
  sent) could lock up the server. What we call zombie connections can happen when
  a client is either totally non-responsive, or when the client is too slow to
  process messages. Now, we will queue up to 500 messages per GraphQL
  subscription, and if the client does not keep up, we will drop the connection.

  This also makes websocket sends non-blocking, so we are no longer sending as
  slowly as the slowest connection. This should greatly improve performance for
  most clients that have a good connection. For clients with a bad connection,
  they will still be slow, there is not much we can do about their internet
  connection. But they will not slow down the server for everyone else. And we
  have clear limits on how many messages we will queue up for them, so their
  connection will reset after a while, which could help them reconnect and get a
  better connection.

## 1.8.0

### Minor Changes

- ac1eb2f: Added the ability to limit the number of concurrent players and users that can
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

- ac1eb2f: Added the ability to authenticate as a user (admin) with a PASETO token instead
  of a password. This is only available on Tajriba, and not in the admin UI yet.

### Patch Changes

- 10de4bb: Improve the admin batch UI. Games are now collapsed by default and can be
  revealed with a click, and games are displayed in a table instead of cards.
- ac1eb2f: Fixed an issue where flags between the root `empirica` command the `empirica
serve` command were conflicting.

## 1.7.2

### Patch Changes

- 4490fd3: Remove unnecessary debug logs.

## 1.7.1

### Patch Changes

- b6cc07f: Fix issue where mutliple appends were called in a row on the same key and only
  the last item was added.

## 1.7.0

### Minor Changes

- 63326f1: Added the ability to manually flush changes outside of callback functions with
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

## 1.6.2

### Patch Changes

- f87c756: Fix misaligned CSV export. Some fields were not aligned with the headers.
- 05212b8: Fix missing scope in vector attribute callbacks.

  E.g.: In `Empirica.on("stage", "chat", (ctx, { stage, chat }) => {`, where
  "chat" is a vector attribute, `stage` was undefined.

- 05212b8: Fix vector attribute invalid get-after-set value.

## 1.6.1

### Patch Changes

- 0f7f99c: You can now add a user with flags from the command line:

  ```bash
  empirica --tajriba.auth.username "erica" --tajriba.auth.name "Erica" --tajriba.auth.password "mypassword"
  ```

  You can also use environment variables:

  ```bash
  export EMPIRICA_TAJRIBA_AUTH_USERNAME="erica"
  export EMPIRICA_TAJRIBA_AUTH_NAME="Erica"
  export EMPIRICA_TAJRIBA_AUTH_PASSWORD="mypassword"
  empirica
  ```

- f12c6a9: Add version logging on `empirica serve`.
- 0f7f99c: Added support for environment variables for configuring Empirica. For example,
  you can now set the `tajriba.store.file` config option with the
  `EMPIRICA_TAJRIBA_AUTH_USERNAME` environment variable instead of using the
  `--tajriba.store.file` command line option.

  Any command line or empirica file options can be set with environment variables
  by replacing the `.` with `_`, uppercasing the name, and prefixing it with
  `EMPIRICA_`. Examples:

  - `--log.level` becomes `EMPIRICA_LOG_LEVEL`
  - `--server.addr` becomes `EMPIRICA_SERVER_ADDR`
  - `--production` becomes `EMPIRICA_PRODUCTION`

- ecc92b8: Fix adding new stages dynamically at the end of a stage.
- 0f7f99c: Increase max line size in tajriba.json to 1MB. This can be usefule when storing
  very large attribute values.
- 0f7f99c: Hide the Empirica menu in prod when it is centered (top or bottom) as it's
  distrating.
- f12c6a9: `empirica serve` now respects the `--tajriba.store.file` command line flag.

## 1.6.0

### Minor Changes

- ae675d8: Add a `[field name]LastChangedAt` for each field in the CSV export. This field
  contains the timestamp of the last change to the field.
- ecd0768: Add `treatmentName`, that contains the name of the treatment, to the game and
  player.

### Patch Changes

- ae675d8: Improved CSV formatting in export.

## 1.5.0

### Minor Changes

- 68756ba: Ignore missing game in if `unamangedGame` flag set on `<EmpiricaContext>`. It is
  up to the developer to handle the game not being present. This could potentially
  be a breaking change.

### Patch Changes

- 68756ba: This ensures all attribute events are absolutely ordered. It also fixes an issue
  where uniq events were not being recorded correctly.
- 68756ba: This fixes a bug where the stage starting callbacks could go out of order and
  cause the game to lock up. This would only manifest itself when new stages were
  added in the previous stage's `onEnd` callback. This fix improves event ordering
  overall.
- 68756ba: Require `player.get("ended")` to be present in order to show exit steps.
- 8390a56: Upgrade tajriba to v1.2.1.

## 1.5.0-next.3

### Patch Changes

- 776f11b: Require `player.get("ended")` to be present in order to show exit steps.

## 1.5.0-next.2

### Patch Changes

- 30e95b4: This ensures all attribute events are absolutely ordered. It also fixes an issue
  where uniq events were not being recorded correctly.

## 1.5.0-next.1

### Minor Changes

- 1cced1a: Ignore missing game in if `unamangedGame` flag set on `<EmpiricaContext>`. It is
  up to the developer to handle the game not being present. This could potentially
  be a breaking change.

## 1.4.7-next.0

### Patch Changes

- 266f2d4: This fixes a bug where the stage starting callbacks could go out of order and
  cause the game to lock up. This would only manifest itself when new stages were
  added in the previous stage's `onEnd` callback. This fix improves event ordering
  overall.

## 1.4.6

### Patch Changes

- 88934e6: Fix EmpiricaMenu SVG React warnings.

## 1.4.5

### Patch Changes

- 079092b: Make admin buttons look right again.
- 079092b: `EmpiricaMenu` component improvements. Add `top` and `bottom` positions. Improve
  styling and readability. Use Lucide icons.

## 1.4.4

### Patch Changes

- 1fff425: This release introduces a very early closed preview of empirica deployments. This is very different from the final version, it is not meant for general use, and comes with no guarantee of working whatsoever.

## 1.4.3

### Patch Changes

- 52f3097: Fix `empirica upgrade` and overall simplify and fix binary downloading and
  caching.

  The caching directory for binaries changed to `$XDG_CACHE_HOME/empirica`.

## 1.4.2

### Patch Changes

- 41f154a: The intro steps should wait for the game to be loaded before rendering.
- 41f154a: Show the lobby if the game is available but the game is not started yet.

## 1.4.1

### Patch Changes

- 079267f: The game is now assigned to the player as soon as they are assigned to a game,
  which means the game will be available in the introduction steps.

## 1.4.0

### Minor Changes

- 1e40bf0: Minor Player UI Improvements:

  - slider css in the empirica core package
  - lighter header
  - better score and timer font configuration
  - remove chat in solo games

## 1.3.8

### Patch Changes

- c7bd8e6: Falsey values were casted to null on `.set()` since the addition of `.append()`.

## 1.3.7

### Patch Changes

- 900b70a: Use `@empirica/core@latest` for `empirica export` if the version is not found.
  We used to `npm link` to the local version, assuming we were in development
  mode. To use the locally linked version, use `export EMPIRICA_DEV=1`.
- 900b70a: Improve server restart mechanics. The server will only try to restart
  automatically 3 times, and then it will stop. This is to prevent the server from
  getting stuck in a restart loop. It will only do this if the restart is
  happening less than 5 seconds after the previous restart.

  We have also improved the error management for new projects. See
  `internal/templates/source/callbacks/package.json` and
  `internal/templates/source/callbacks/src/index.js` if you want to replicate the
  changes in your already created project.

- 900b70a: Enforce a max duration for stages. It is set to 1 billion seconds (~31 years) in
  order to safely stay under the max value of a Go time.Duration object. See #319
  for details.

## 1.3.6

### Patch Changes

- 4970481: Fixes to the scope updates tracking released in the previous version.

## 1.3.5

### Patch Changes

- 229069a: Player scopes updated was not tracking composite scopes (playerRound,
  playerStage...) correctly. This is now fixed.

## 1.3.4

### Patch Changes

- 56b7c88: On a server restart (callbacks), we were not waiting for all the attributes to
  be loaded on a scope before running callbacks. This could lead to errors when
  trying to access attributes that were not yet loaded. Notably, the `on.once`
  callbacks would run multiple times, instead of... once.

  We also had a bug in the `on.once` callbacks, where we were not checking the
  correct attribute key to see if the callback had already been run. (☉_☉)

- ac3bb60: The `serve` command would ignore the `--addr` flag to specify the address to
  listen on. This is now fixed. Thanks to @malsobay for the report. Fixes #315.

## 1.3.3

### Patch Changes

- fef4bb4: Empirica proxy download was using hard links and it could break upgrades. It now uses copy for safety.
  That does mean we are using up more space on disk, but it remain relatively minimal all things
  considered. We might want to look into pruning old versions at some point, but it does not seem
  critical at the moment since empirica binaries are not that large.

  We've also improved looking up the current project release version by looking for the .empirica
  directory in parent directories. This is helpful in the case of export, which runs in subdirectory and
  will not pick up the correct empirica version.

- 681c4c6: `empirica upgrade` will automaticall run in "global" mode when not in a project.

## 1.3.2

### Patch Changes

- c3f017c: Export broken after logging separation with Tajriba. Fixes #299
- 39b83f1: Fixed an issue where components passed into intro and exit steps that were using closure would hard reload when attributes were updated on game or player. Fixes #263.

## 1.3.1

### Patch Changes

- 308e75b: Make sure that the folder that will contain the callbacks session token is
  created before trying to save the token.
- c443f51: Ensure stage submit happening after stage end will not throw.

## 1.3.0

### Minor Changes

- 991518e: New and improved `<EmpiricaMenu>`. It's much smaller and more convenient to use.

  You can position in any corner of the screen.

  ```jsx
  <EmpiricaMenu position="bottom-left" /> // default
  <EmpiricaMenu position="bottom-right" />
  <EmpiricaMenu position="top-left" />
  <EmpiricaMenu position="top-right" />
  ```

- 991518e: New `<Chat>` component! Similar to Chat in v1, it is now part of Empirica core.
  You can use it like this:

  ```jsx
  import { Chat, useGame } from "@empirica/core/player/classic/react";

  import React from "react";
  import { Profile } from "./Profile";
  import { Stage } from "./Stage";

  export function Game() {
    const game = useGame();
    return (
      <div className="h-full w-full flex">
        <div className="h-full w-full flex flex-col">
          <Profile />
          <div className="h-full flex items-center justify-center">
            <Stage />
          </div>
        </div>
        <div className="h-full w-128 border-l flex justify-center items-center">
          <Chat scope={game} attribute="chat" />
        </div>
      </div>
    );
  }
  ```

  The `Chat` component currently takes two props, `scope` and `attribute`, but we
  will add more features in the future.

## 1.2.0

### Minor Changes

- b5d80ad: - Support for vector attributes added

  Vector attributes are attributes that are lists of values. Vector attributes
  are supported by the `.append()` method. The `.append()` method will append
  the given value to the list. If the attribute is not a list, the `.append()`
  method will fail. Appends will not override each other if 2 users append to
  the same attribute concurrently.

  Example:

  ```js
  const game = userGame();

  game.append("messages", { text: "hello" });
  game.append("messages", { text: "world" });

  const messages = game.get("messages"); // [{ text: 'hello' }, { text: 'world' }]
  ```

  Vector attributes can be used to implement chat, message boards, and other
  features that require a list of items. Only changes to the vector attribute
  will be sent to the other players. This means that if you have a list of
  messages, and you append a new message, only the new message will be sent to
  the other players. This is useful for reducing the amount of data that needs
  to be sent over the network, and improve performance.

  A specific index of a vector attribute can updated with the `.set()` method
  using the `index` argument.

  Example:

  ```js
  const game = userGame();

  game.append("messages", { text: "hello" });
  game.append("messages", { text: "world" });

  game.set("messages", { text: "hi" }, { index: 0 });

  const messages = game.get("messages"); // [{ text: 'hi' }, { text: 'world' }]
  ```

  - Attributes can be set in batch

    The `.set()` method now accepts an array of attributes to set. This is
    useful for setting multiple attributes at once without sending multiple
    messages to the server. All attributes will be applied on the server
    atomically.

    Example:

    ```js
    const game = userGame();

    game.set([
      { key: "name", value: "John" },
      { key: "age", value: 30 },
    ]);

    game.set([
      { key: "messages", value: { text: "hey" }, ao: { index: 0 } },
      { key: "messages", value: { text: "universe" }, ao: { index: 1 } },
    ]);
    ```

  - do not show "no games" page while loading a registered player. Fixes #134
    (again).

- f3d9f02: fix: show error when callbacks (`server/`) crash on `empirica` start (#281)
- 2fbb1ee: #213: Disable auto end batch

  By default if all existing games are complete, the batch ends.
  This option disables this pattern so that we can leave a batch open indefinitely.
  It enables spawning new games for people who arrive later, even if all previous games have been already finished.

  The change adds a `disableBatchAutoend` param in the server configuration.

  In order to use the feature, set the `disableBatchAutoend` option to true in `<your-experiment>/server/src/index.js`, e.g.

  ```js
  ctx.register(
    Classic({
      disableBatchAutoend: true,
    })
  );
  ```

### Patch Changes

- 5613b40: fix: enable attribute versions

## 1.1.2

### Patch Changes

- 486bdee: Another test release

## 1.1.1

### Patch Changes

- c1735d1: Just testing the core release

## 1.1.0

### Minor Changes

- 549a84e: Implement stage submission with player dropout (#219)
  Fix issue with a player being displayed as ready despite being offline
  Fix error console when receieving the ParticipantConnected/Participant disconnected event

### Patch Changes

- 20ad61e: Display custom batch JSON in admin page

## 1.0.8

### Patch Changes

- dac8c4e: Fix empirica build pipelines (no real changes in the package)

## 1.0.7

### Patch Changes

- 8608440: Change Empirica release process

## 1.0.6

### Patch Changes

- 35016f6: Fix build on tag creation

## 1.0.5

### Patch Changes

- 4e0d998: Fix tag version

## 1.0.4

### Patch Changes

- e984fe3: Fix publish (ignore e2e tests)
- 4047181: Fix for publish

## 1.0.3

### Patch Changes

- a23b822: Another try to fix the package publishing

## 1.0.2

### Patch Changes

- 8175563: Fix release script

## 1.1.0

### Minor Changes

- 8a1838c: Fix lobbies endpoints not being exposed when using the server command
- 827b5e8: Fix timer not showing when player joins a game (#207)

## 1.0.1

### Patch Changes

- 268dc80: Release of v1
