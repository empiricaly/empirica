import { conditions } from "./game/conditions.js";
import { init } from "./game/init.js";
import { onRoundEnd, onRoundStart, onStageEnd } from "./game/callbacks.js";

export const config = {
  conditions,
  init,
  onRoundStart,
  onStageEnd,
  onRoundEnd,
  bots: []
};
