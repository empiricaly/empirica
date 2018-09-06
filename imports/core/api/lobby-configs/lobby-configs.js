import SimpleSchema from "simpl-schema";
import inflection from "inflection";

import { Batches } from "../batches/batches";
import { GameLobbies } from "../game-lobbies/game-lobbies.js";
import {
  HasManyByRef,
  TimestampSchema,
  ArchivedSchema
} from "../default-schemas";

export const LobbyConfigs = new Mongo.Collection("lobby_configs");

LobbyConfigs.helpers({
  displayName() {
    if (this.name) {
      return this.name;
    }

    const type = inflection.titleize(this.timeoutType);
    const base = `${type}: ${this.timeoutInSeconds}s`;
    let details;
    switch (this.timeoutType) {
      case "lobby":
        details = `→ ${inflection.titleize(this.timeoutStrategy)}`;
        if (this.timeoutStrategy === "bots") {
          details += `(${this.timeoutBots.join(",")})`;
        }
        break;
      case "individual":
        details = `⨉ ${this.extendCount + 1}`;
        break;
      default:
        console.error(`unknown timeoutType: ${this.timeoutType}`);
        return base;
    }

    return `${base} ${details}`;
  }
});

// There are 2 exclusive timeout types:
// - lobby: the timeout start when the first player reaches the lobby and runs
//   out for all the players whether they have even reached the lobby or not.
// - individual: the timeout is started for each player as they reach the room.
//   Some players might time out before all players are in the lobby, they might
//   continue waiting for another timeout period. They might also leave the game
//   and a new player can replace them. The lobby itself never times out.
LobbyConfigs.timeoutTypes = ["lobby", "individual"];

// The timeoutStrategy determines what to do in case people are waiting
// in the lobby for longer than the timeoutInSeconds duration.
// Only for "lobby" timeoutType.
// Available strategies:
// - ignore: start the game anyway
// - fail: take the player to the exit survey
// - bots: fill the missing players slots with bots from timeoutBots
LobbyConfigs.timeoutStrategies = ["fail", "ignore"];
// DEACTIVATING bots until bots implemented.
// LobbyConfigs.timeoutStrategies = ["fail", "ignore", "bots"];

// One year, that's a lot, just need to block from something too wild like 10M
// years. We don't actually care, Inf would be fine...
LobbyConfigs.maxTimeoutInSeconds = 365 * 24 * 60 * 60;

// defaultTimeoutInSeconds is simply used as the default value in the Lobby
// Configuration creation form.
LobbyConfigs.defaultTimeoutInSeconds = 5 * 60;

LobbyConfigs.schema = new SimpleSchema({
  // Optional experimenter given name for the treatment
  name: {
    type: String,
    max: 256,
    optional: true,
    custom() {
      if (this.isSet && LobbyConfigs.find({ name: this.value }).count() > 0) {
        return "notUnique";
      }
    }
    // regEx: /^[a-zA-Z0-9_]+$/
  },

  // The timeoutType fundamentally changes the behavior of the lobby. See
  // LobbyConfigs.timeoutTypes above for details.
  timeoutType: {
    type: String,
    allowedValues: LobbyConfigs.timeoutTypes
  },

  // Number of seconds for one player to wait in lobby before timeoutStrategy
  // is applied. This timeout applies only to the waiting for the game to start.
  // It is either a "Lobby Timeout", or an "Individual Timeout", depending on
  // the timeoutType value.
  timeoutInSeconds: {
    type: SimpleSchema.Integer,
    max: LobbyConfigs.maxTimeoutInSeconds,
    // It would be difficult to manage a timer that is less than 5s, and it
    // would be  weird. 5s is already weird...
    min: 5
  },

  // The timeoutStrategy determines what to do in case people are waiting
  // in the lobby for longer than the timeoutInSeconds duration.
  // Only for "lobby" timeoutType.
  // See LobbyConfigs.timeoutStrategies for details.
  timeoutStrategy: {
    type: String,
    allowedValues: LobbyConfigs.timeoutStrategies,
    defaultValue: "fail",
    optional: true
  },

  // Names of bot to use if timed out and still not enough player.
  // Only for "lobby" timeoutType and timeoutStrategy is "bots".
  timeoutBots: {
    type: Array,
    // Should add custom validation to verify the timeoutStrategy and make
    // required if "bots" and should verify bot with name exists.
    optional: true
  },
  "timeoutBots.$": {
    type: String
  },

  // Number of times to allow the user to extend their wait time by
  // timeoutInSeconds.
  // If set to 0, they are never asked to retry.
  // Only for "individual" timeoutType.
  extendCount: {
    type: SimpleSchema.Integer,
    // 1 millard times, that should be a sufficient upper bound
    max: 1000000000,
    min: 0,
    optional: true
  }
});

LobbyConfigs.schema.extend(TimestampSchema);
LobbyConfigs.schema.extend(ArchivedSchema);
Meteor.startup(() => {
  LobbyConfigs.schema.extend(HasManyByRef(Batches));
  LobbyConfigs.schema.extend(HasManyByRef(GameLobbies));
});
LobbyConfigs.attachSchema(LobbyConfigs.schema);
