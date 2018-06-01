import SimpleSchema from "simpl-schema";

import { GameLobbies } from "../game-lobbies/game-lobbies";
import { Games } from "../games/games";
import {
  TimestampSchema,
  HasManyByRef,
  DebugModeSchema
} from "../default-schemas";
import { Treatments } from "../treatments/treatments";

export const Batches = new Mongo.Collection("batches");

Batches.helpers({
  gameCount() {
    return this.assignment === "simple"
      ? this.simpleConfig.count
      : this.completeGameCount();
  },

  completeGameCount() {
    return _.reduce(
      this.completeConfig.treatments,
      (sum, t) => sum + t.count,
      0
    );
  },

  duplicate() {
    const { assignment, simpleConfig, completeConfig } = this;
    Batches.insert({
      assignment,
      simpleConfig,
      completeConfig,
      status: "init"
    });
  }
});

export const maxGamesCount = 10000000;

export const assignmentTypes = {
  simple: "Simple",
  complete: "Complete"
};

Batches.statusSchema = new SimpleSchema({
  status: {
    type: String,
    allowedValues: [
      "init", // Batch created, not running yet
      "running", // Batch is running

      // NOTE(np): paused: for now, we don't support paused because we need to do something about timers
      // "paused", // Batch has been pause, ongoing games keep on going but no more new players are accepted. Can be restarted.

      "finished", // Batch has finished and cannot be restarted

      // NOTE(np): cancelled might break a game if it's running at the moment, gotta be careful
      "cancelled" // Batch was cancelled and cannot be restarted
    ],
    defaultValue: "init",
    index: 1
  }
});

Batches.schema = new SimpleSchema({
  assignment: {
    type: String,
    // "custom" not yet supported
    allowedValues: ["simple", "complete", "custom"]
  },

  full: {
    label: "Batch is full, all games are running",
    type: Boolean,
    defaultValue: false
  },

  runningAt: {
    label: "Time when batch started running",
    type: Date,
    optional: true
  },

  finishedAt: {
    label: "Time when batch finished running",
    type: Date,
    optional: true
  },

  // Simple configuration at init
  simpleConfig: {
    type: Object,
    optional: true,
    custom() {
      if (!this.value && this.field("assignment").value === "simple") {
        return "required";
      }
    }
  },
  "simpleConfig.count": {
    type: SimpleSchema.Integer,
    min: 1,
    max: maxGamesCount
  },
  "simpleConfig.treatments": {
    type: Array,
    minCount: 1,
    maxCount() {
      return Treatments.find().count();
    }
  },
  "simpleConfig.treatments.$": {
    type: Object
  },
  "simpleConfig.treatments.$._id": {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  "simpleConfig.treatments.$.lobbyConfigId": {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },

  // Complete configuration at init
  completeConfig: {
    type: Object,
    optional: true,
    custom() {
      if (!this.value && this.field("assignment").value === "complete") {
        return "required";
      }
    }
  },
  "completeConfig.treatments": {
    type: Array,
    minCount: 1,
    maxCount() {
      return Treatments.find().count();
    }
  },
  "completeConfig.treatments.$": {
    type: Object
  },
  "completeConfig.treatments.$._id": {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  "completeConfig.treatments.$.count": {
    type: SimpleSchema.Integer,
    minCount: 1,
    maxCount: maxGamesCount
  },
  "completeConfig.treatments.$.lobbyConfigId": {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  }
});

if (Meteor.isDevelopment || Meteor.settings.public.debug_gameDebugMode) {
  Batches.schema.extend(DebugModeSchema);
}

Batches.schema.extend(Batches.statusSchema);
Batches.schema.extend(TimestampSchema);
Meteor.startup(function() {
  Batches.schema.extend(HasManyByRef(Games));
  Batches.schema.extend(HasManyByRef(GameLobbies));
});
Batches.attachSchema(Batches.schema);
