# @empirica/core

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
