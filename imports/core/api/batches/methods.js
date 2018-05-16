import { ValidatedMethod } from "meteor/mdg:validated-method";

import { Batches } from "./batches";
import { GameLobbies } from "../game-lobbies/game-lobbies.js";
import { Games } from "../games/games.js";
import { IdSchema } from "../default-schemas";

export const createBatch = new ValidatedMethod({
  name: "Batches.methods.create",

  validate: Batches.schema
    .omit("status", "createdAt", "updatedAt", "debugMode", "full")
    .validator(),

  run(batch) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    Batches.insert(batch);
  }
});

export const duplicateBatch = new ValidatedMethod({
  name: "Batches.methods.duplicate",

  validate: IdSchema.validator(),

  run({ _id }) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    const batch = Batches.findOne(_id);
    batch.duplicate();
  }
});

export const updateBatchStatus = new ValidatedMethod({
  name: "Batches.methods.updateStatus",

  validate: Batches.schema
    .pick("status")
    .extend(IdSchema)
    .validator(),

  run({ _id, status }) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    const batch = Batches.findOne(_id);
    if (!batch) {
      throw new Error("not found");
    }

    if (status === "init") {
      throw new Error("invalid");
    }

    const $set = { status };

    if (status === "running") {
      $set.runningAt = new Date();
    }

    Batches.update(_id, { $set });
  }
});

if (Meteor.isDevelopment || Meteor.settings.public.debug_gameDebugMode) {
  export const setBatchInDebugMode = new ValidatedMethod({
    name: "Batches.methods.debugMode",

    validate: IdSchema.validator(),

    run({ _id }) {
      if (!this.userId) {
        throw new Error("unauthorized");
      }

      const batch = Batches.findOne(_id);
      if (!batch) {
        throw new Error("not found");
      }

      Batches.update(_id, { $set: { debugMode: true } });
      GameLobbies.update({ batchId: _id }, { $set: { debugMode: true } });
      Games.update({ batchId: _id }, { $set: { debugMode: true } });
    }
  });
}
