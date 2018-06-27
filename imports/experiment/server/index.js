import { conditions } from "./game/conditions.js";
import { init } from "./game/init.js";
import callbacks from "./game/callbacks.js";

const {
  onGameEnd,
  onGameStart,
  onRoundEnd,
  onRoundStart,
  onSet,
  onChange,
  onAppend,
  onStageEnd,
  onStageStart
} = callbacks;

export const config = {
  conditions,
  init,
  bots: [],
  onGameStart,
  onRoundStart,
  onStageStart,
  onSet,
  onAppend,
  onChange,
  onStageEnd,
  onRoundEnd,
  onGameEnd
};
