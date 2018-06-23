import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";
import { Rounds } from "./rounds.js";

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
    }
  }).validator(),

  run({ roundId, key, value, append }) {
    const round = Rounds.findOne(roundId);
    if (!round) {
      throw new Error("round not found");
    }
    // TODO check can update this record round

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    Rounds.update(roundId, modifier, { autoConvert: false });
  }
});
