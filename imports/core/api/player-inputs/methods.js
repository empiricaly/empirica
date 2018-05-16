import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";

import { PlayerInputs } from "./player-inputs.js";
import { Players } from "../players/players.js";

// addPlayerInput is non-destructive, it just keeps adding onto a player's
// input data.
export const addPlayerInput = new ValidatedMethod({
  name: "PlayerInputs.methods.add",

  validate: new SimpleSchema({
    playerId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    data: {
      type: String
    }
  }).validator(),

  run({ playerId, data: rawData }) {
    const player = Players.findOne(playerId);
    if (!player) {
      throw new Error("player not found");
    }

    const data = JSON.parse(rawData);
    PlayerInputs.insert({ playerId, data });
  }
});
