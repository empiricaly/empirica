import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";
import { PlayerRounds } from "./player-rounds";

let callOnChange;
if (Meteor.isServer) {
  callOnChange = require("../server/onchange").callOnChange;
}

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
    },
    append: {
      type: Boolean,
      optional: true
    }
  }).validator(),

  run({ playerRoundId, key, value, append }) {
    const playerRound = PlayerRounds.findOne(playerRoundId);
    if (!playerRound) {
      throw new Error("playerRound not found");
    }
    // TODO check can update this record playerRound

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    PlayerRounds.update(playerRoundId, modifier, { autoConvert: false });

    if (Meteor.isServer) {
      callOnChange({
        playerId: playerRound.playerId,
        playerRoundId,
        playerRound,
        key,
        value: val,
        prevValue: playerRound.data && playerRound.data[key],
        append
      });
    }
  }
});
