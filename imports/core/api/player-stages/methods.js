import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";
import { PlayerStages } from "./player-stages";

let callOnChange;
if (Meteor.isServer) {
  callOnChange = require("../server/onchange").callOnChange;
}

export const updatePlayerStageData = new ValidatedMethod({
  name: "PlayerStages.methods.updateData",

  validate: new SimpleSchema({
    playerStageId: {
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
    },
    noCallback: {
      type: Boolean,
      optional: true
    }
  }).validator(),

  run({ playerStageId, key, value, append, noCallback }) {
    const playerStage = PlayerStages.findOne(playerStageId);
    if (!playerStage) {
      throw new Error("playerStage not found");
    }

    // TODO check can update this record playerStage

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    PlayerStages.update(playerStageId, modifier, { autoConvert: false });

    if (Meteor.isServer && !noCallback) {
      callOnChange({
        playerId: playerStage.playerId,
        playerStageId,
        playerStage,
        key,
        value: val,
        prevValue: playerStage.data && playerStage.data[key],
        append
      });
    }
  }
});

export const submitPlayerStage = new ValidatedMethod({
  name: "PlayerStages.methods.submit",

  validate: new SimpleSchema({
    playerStageId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    noCallback: {
      type: Boolean,
      optional: true
    }
  }).validator(),

  run({ playerStageId }) {
    const playerStage = PlayerStages.findOne(playerStageId);
    if (!playerStage) {
      throw new Error("playerStage not found");
    }
    // TODO check can update this record playerStage

    if (playerStage.submittedAt) {
      throw new Error("not permitted");
    }

    PlayerStages.update(playerStageId, { $set: { submittedAt: new Date() } });
  }
});
