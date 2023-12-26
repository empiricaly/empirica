---
"@empirica/core": patch
---

Fix setting attributes with the same mutated object as the current one.

For example, before this patch, the value would not be saved, since we are
reusing the same object, which we've only mutated in place:

```js
const value = player.get("myobject");
value["mykey"] = "myvalue";
player.set("myobject", value);
```
