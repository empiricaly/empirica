import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";
import { Stages } from "./stages.js";

export const updateStageData = new ValidatedMethod({
  name: "Stages.methods.updateData",

  validate: new SimpleSchema({
    stageId: {
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

  run({ stageId, key, value, append }) {
    const stage = Stages.findOne(stageId);
    if (!stage) {
      throw new Error("stage not found");
    }
    // TODO check can update this record stage

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    Stages.update(stageId, modifier, { autoConvert: false });
  }
});
