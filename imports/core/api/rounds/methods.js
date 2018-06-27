import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";

import { Rounds } from "./rounds.js";

let callOnChange, playerIdForConn;
if (Meteor.isServer) {
  playerIdForConn = require("../../startup/server/connections.js")
    .playerIdForConn;
  callOnChange = require("../server/onchange").callOnChange;
}

export const updateRoundData = new ValidatedMethod({
  name: "Rounds.methods.updateData",

  validate: new SimpleSchema({
    roundId: {
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

  run({ roundId, key, value, append, noCallback }) {
    const round = Rounds.findOne(roundId);
    if (!round) {
      throw new Error("round not found");
    }
    // TODO check can update this record round

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    Rounds.update(roundId, modifier, { autoConvert: false });

    if (Meteor.isServer && !noCallback) {
      callOnChange({
        playerId: playerIdForConn(this.connection),
        roundId,
        round,
        key,
        value: val,
        prevValue: round.data && round.data[key],
        append
      });
    }
  }
});
