import { publishComposite } from "meteor/reywood:publish-composite";

import { Conditions } from "../../conditions/conditions.js";
import { GameLobbies } from "../game-lobbies";
import { Players } from "../../players/players";
import { Treatments } from "../../treatments/treatments";
import { LobbyConfigs } from "../../lobby-configs/lobby-configs.js";

publishComposite("gameLobby", function({ playerId }) {
  return {
    find() {
      return Players.find(playerId);
    },

    children: [
      {
        find({ gameLobbyId }) {
          return GameLobbies.find({
            _id: gameLobbyId
            // $or: [{ playerIds: playerId }, { queuedPlayerIds: playerId }]
          });
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
            find({ lobbyConfigId }) {
              return LobbyConfigs.find(lobbyConfigId);
            }
          }
        ]
      }
    ]
  };
});
