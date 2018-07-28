import SimpleSchema from "simpl-schema";

import { Batches } from "../batches/batches";
import { GameLobbies } from "../game-lobbies/game-lobbies";
import { Games } from "../games/games";
import { TimestampSchema, UserDataSchema, BelongsTo } from "../default-schemas";

export const Players = new Mongo.Collection("players");

Players.schema = new SimpleSchema({
  // The Player `id` is used to uniquely identify the player to avoid
  // having a user play multiple times. It can be any string, for example
  // an email address, a Mechanical Turk ID, a manually assigned participation
  // number (saved as string), etc...
  id: {
    type: String,
    max: 256
  },

  bot: {
    label: "Name of bot definition if player is a bot",
    type: String,
    optional: true,
    index: 1
  },

  // Time at witch the player became ready (done with intro)
  readyAt: {
    label: "Ready At",
    type: Date,
    optional: true
  },

  timeoutStartedAt: {
    label: "Time the first player arrived in the lobby",
    type: Date,
    optional: true
  },
  timeoutWaitCount: {
    label: "Number of time the player has waited for timeoutStartedAt",
    type: SimpleSchema.Integer,
    optional: true,
    min: 1
  },

  exitStepsDone: {
    type: Array,
    defaultValue: []
  },
  "exitStepsDone.$": {
    type: String
  },

  // Failed fields are filled when the player's participation in a game failed
  exitAt: {
    label: "Exited At",
    type: Date,
    optional: true
  },
  exitStatus: {
    label: "Failed Reason",
    type: String,
    optional: true,
    allowedValues: [
      "gameFull",
      "gameCancelled",
      "gameLobbyTimedOut",
      "playerEndedLobbyWait",
      "playerLobbyTimedOut",
      "finished"
    ]
  }
});

Players.schema.extend(TimestampSchema);
Players.schema.extend(UserDataSchema);
Meteor.startup(function() {
  Players.schema.extend(BelongsTo(Games, false, false));
  Players.schema.extend(BelongsTo(GameLobbies, false, false));
});
Players.attachSchema(Players.schema);
