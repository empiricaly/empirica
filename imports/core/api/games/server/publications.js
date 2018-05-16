import { publishComposite } from "meteor/reywood:publish-composite";

import { Conditions } from "../../conditions/conditions.js";
import { Games } from "../games";
import { PlayerRounds } from "../../player-rounds/player-rounds";
import { PlayerStages } from "../../player-stages/player-stages";
import { Players } from "../../players/players";
import { Rounds } from "../../rounds/rounds";
import { Stages } from "../../stages/stages";
import { Treatments } from "../../treatments/treatments";

publishComposite("game", function({ playerId }) {
  return {
    find() {
      return Games.find({ playerIds: playerId });
    },
    children: [
      {
        find({ treatmentId }) {
          return Treatments.find(treatmentId);
        },
        children: [
          {
            find({ conditionIds }) {
              return Conditions.find({ _id: { $in: conditionIds } });
            }
          }
        ]
      },
      {
        find({ _id: gameId, currentStageId }) {
          return Rounds.find({ gameId });
        }
      },
      {
        find({ _id: gameId }) {
          return Stages.find({ gameId });
        }
      },
      {
        find({ _id: gameId }) {
          return Players.find({ gameId });
        }
      },
      {
        find({ _id: gameId }) {
          return PlayerStages.find({ gameId });
        }
      },
      {
        find({ _id: gameId }) {
          return PlayerRounds.find({ gameId });
        }
      }
    ]
  };
});
