---
"@empirica/core": minor
---

New `<Chat>` component! Similar to Chat in v1, it is now part of Empirica core.
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
