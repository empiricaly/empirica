import { ValidatedMethod } from "meteor/mdg:validated-method";
import { Games } from "./games.js";
import SimpleSchema from "simpl-schema";

export const updateGameData = new ValidatedMethod({
  name: "Games.methods.updateData",

  validate: new SimpleSchema({
    gameId: {
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

  run({ gameId, key, value, append }) {
    const game = Games.findOne(gameId);
    if (!game) {
      throw new Error("game not found");
    }
    // TODO check can update this record game

    const val = JSON.parse(value);
    let update = { [`data.${key}`]: val };
    const modifier = append ? { $push: update } : { $set: update };

    Games.update(gameId, modifier, { autoConvert: false });
  }
});
