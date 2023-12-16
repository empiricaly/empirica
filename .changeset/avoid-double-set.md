---
"@empirica/core": patch
---

Avoid re-setting a key to the same value from the client side. For example:

```js
scope.set("key", "value");
scope.set("key", "value"); // no-op
```

This is not only for sets in the same tick as shown here, but also across ticks.
