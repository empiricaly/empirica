import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";

import { IdSchema } from "../default-schemas.js";
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

export const updateTreatment = new ValidatedMethod({
  name: "Treatments.methods.update",

  validate: Treatments.schema
    .pick("name")
    .extend(
      new SimpleSchema({
        archived: {
          type: Boolean,
          optional: true
        }
      })
    )
    .extend(IdSchema)
    .validator(),

  run({ _id, name, archived }) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }
    const treatment = Treatments.findOne(_id);
    if (!treatment) {
      throw new Error("not found");
    }

    const $set = {},
      $unset = {};
    if (name !== undefined) {
      $set.name = name;
    }
    if (archived !== undefined) {
      if (archived) {
        if (treatment.archivedAt) {
          throw new Error("not found");
        }

        $set.archivedAt = new Date();
        $set.archivedById = this.userId;
      }
      if (!archived) {
        if (!treatment.archivedAt) {
          throw new Error("not found");
        }

        $unset.archivedAt = true;
        $unset.archivedById = true;
      }
    }

    const modifier = {};
    if (Object.keys($set).length > 0) {
      modifier.$set = $set;
    }
    if (Object.keys($unset).length > 0) {
      modifier.$unset = $unset;
    }
    if (Object.keys(modifier).length === 0) {
      return;
    }

    Treatments.update(_id, modifier);
  }
});
