import { conditions } from "./game/conditions.js";
import { init } from "./game/init.js";
import { onRoundEnd, onRoundStart, onStageEnd, onGameEnd} from "./game/callbacks.js";

export const config = {
  conditions,
  init,
  onRoundStart,
  onStageEnd,
  onRoundEnd,
  onGameEnd,
  bots: []
};
