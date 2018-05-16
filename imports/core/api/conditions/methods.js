import { ValidatedMethod } from "meteor/mdg:validated-method";

import { Conditions } from "./conditions.js";
import { IdSchema } from "../default-schemas.js";

export const createCondition = new ValidatedMethod({
  name: "Conditions.methods.create",

  validate: Conditions.schema.omit("createdAt", "updatedAt").validator(),

  run(condition) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    Conditions.insert(condition, { autoConvert: false });
  }
});

export const updateCondition = new ValidatedMethod({
  name: "Conditions.methods.update",

  validate: Conditions.schema
    .pick("name")
    .extend(IdSchema)
    .validator(),

  run({ _id, name }) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    Conditions.update(_id, { $set: { name } });
  }
});
