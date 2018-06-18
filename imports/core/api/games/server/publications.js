import { publishComposite } from "meteor/reywood:publish-composite";

import { Conditions } from "../../conditions/conditions.js";
import { Games } from "../games";
import { PlayerRounds } from "../../player-rounds/player-rounds";
import { PlayerStages } from "../../player-stages/player-stages";
import { Players } from "../../players/players";
import { Rounds } from "../../rounds/rounds";
import { Stages } from "../../stages/stages";
import { Treatments } from "../../treatments/treatments";

Meteor.publish("game", function({ playerId }) {
  return Games.find({ playerIds: playerId });
});

Meteor.publish("gameDependencies", function({ gameId }) {
  if (!gameId) {
    return [];
  }

  return [
    Rounds.find({ gameId }),
    Stages.find({ gameId }),
    Players.find({ gameId }),
    PlayerStages.find({ gameId }),
    PlayerRounds.find({ gameId })
  ];
});
