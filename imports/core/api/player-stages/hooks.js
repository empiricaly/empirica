// See if everyone is done with this stage
import { PlayerStages } from "./player-stages";
import { endOfStage } from "../stages/finish.js";

PlayerStages.after.update(
  function(userId, playerStage, fieldNames, modifier, options) {
    if (!fieldNames.includes("submittedAt")) {
      return;
    }
    const { stageId } = playerStage;

    const totalCount = PlayerStages.find({ stageId }).count();
    const doneCount = PlayerStages.find({
      stageId,
      submittedAt: { $exists: true }
    }).count();

    if (totalCount === doneCount) {
      endOfStage(stageId);
    }
  },
  { fetchPrevious: false }
);
