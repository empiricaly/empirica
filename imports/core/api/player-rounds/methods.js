import SimpleSchema from "simpl-schema";

import { PlayerRounds } from "./player-rounds";

export const updatePlayerRoundData = new ValidatedMethod({
  name: "PlayerRounds.methods.updateData",

  validate: new SimpleSchema({
    playerRoundId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    key: {
      type: String
    },
    value: {
      type: String
    }
  }).validator(),

  run({ playerRoundId, key, value }) {
    const playerRound = PlayerRounds.findOne(playerRoundId);
    if (!playerRound) {
      throw new Error("playerRound not found");
    }
    // TODO check can update this record playerRound

    const val = JSON.parse(value);
    const $set = {
      [`data.${key}`]: val
    };

    PlayerRounds.update(playerRoundId, { $set }, { autoConvert: false });
  }
});
