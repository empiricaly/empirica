import SimpleSchema from "simpl-schema";
import { Treatments } from "./treatments";

export const createTreatment = new ValidatedMethod({
  name: "Treatments.methods.create",

  validate: new SimpleSchema({
    name: {
      type: String,
      max: 256,
      optional: true
    },
    conditionIds: {
      type: Array,
      label: "Conditions"
    },
    "conditionIds.$": {
      type: String
    }
  }).validator(),

  run(treatment) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    Treatments.insert(treatment);
  }
});
