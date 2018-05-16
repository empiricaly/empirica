import SimpleSchema from "simpl-schema";

import { Batches } from "../batches/batches";
import { BelongsTo, HasManyByRef, TimestampSchema } from "../default-schemas";
import { DebugModeSchema } from "../default-schemas.js";
import { Games } from "../games/games.js";
import { LobbyConfigs } from "../lobby-configs/lobby-configs.js";
import { Players } from "../players/players";
import { Treatments } from "../treatments/treatments";

export const GameLobbies = new Mongo.Collection("game_lobbies");

GameLobbies.helpers({
  players() {
    return Players.find({ _id: { $in: this.playerIds } }).fetch();
  },
  batch() {
    return Batches.findOne({ _id: this.batchId });
  },
  treatment() {
    return Treatments.findOne({ _id: this.treatmentId });
  }
});

GameLobbies.schema = new SimpleSchema({
  // index allows for an ordering of lobbies so we know which one
  // to choose from next
  index: {
    type: SimpleSchema.Integer,
    min: 0,
    label: "Position"
  },

  // availableCount tells us how many slots are available in this lobby (== treatment.playerCount)
  availableCount: {
    type: SimpleSchema.Integer,
    min: 0,
    label: "Available Slots Count"
  },

  // queuedCount tells us how many players are queued to start, but haven't
  // finished the intro steps yet. It might be higher than availableCount as we
  // allow overbooking to make games start faster.
  queuedCount: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0,
    label: "Queued Players Count"
  },

  // readyCount tells us how many players are ready to start (finished intro)
  // Once availableCount == readyCount, the game starts. Player that are queued
  // but haven't made it past the intro in time will be led to the outro
  // directly.
  readyCount: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0,
    label: "Ready Players Count"
  },

  startedAt: {
    label: "Time when the corresponding game started",
    type: Date,
    optional: true
  },

  timeoutStartedAt: {
    label: "Time the first player arrived in the lobby",
    type: Date,
    optional: true
  },

  timedOutAt: {
    label: "Time when the lobby timed out and was cancelled",
    type: Date,
    optional: true
  },

  // Queued players are players that have been associated with the lobby
  // but are not confirmed for the game yet. playerIds is used for confirmed
  // players
  queuedPlayerIds: {
    type: Array,
    defaultValue: [],
    label: `Queued Players`,
    index: true
  },
  "queuedPlayerIds.$": {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    label: `Queued Player`
  }
});

if (Meteor.isDevelopment || Meteor.settings.public.debug_gameDebugMode) {
  GameLobbies.schema.extend(DebugModeSchema);
}

GameLobbies.schema.extend(TimestampSchema);
Meteor.startup(() => {
  GameLobbies.schema.extend(BelongsTo(Games, false, false));
  GameLobbies.schema.extend(BelongsTo(Treatments));
  GameLobbies.schema.extend(HasManyByRef(Players));
  GameLobbies.schema.extend(BelongsTo(Batches));
  GameLobbies.schema.extend(BelongsTo(LobbyConfigs));
  // We are denormalizing the parent batch status in order to make clean queries
  GameLobbies.schema.extend(Batches.statusSchema);
});
GameLobbies.attachSchema(GameLobbies.schema);
