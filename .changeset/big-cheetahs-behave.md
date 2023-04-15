---
"@empirica/core": minor
---

- Support for vector attributes added

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
