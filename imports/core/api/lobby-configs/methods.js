import SimpleSchema from "simpl-schema";
import { ValidatedMethod } from "meteor/mdg:validated-method";

import { LobbyConfigs } from "./lobby-configs.js";
import { IdSchema } from "../default-schemas.js";

export const createLobbyConfig = new ValidatedMethod({
  name: "LobbyConfigs.methods.create",

  validate: LobbyConfigs.schema
    .pick(
      "name",
      "timeoutType",
      "timeoutInSeconds",
      "timeoutStrategy",
      "timeoutBots",
      "timeoutBots.$",
      "extendCount"
    )
    .validator(),

  run(lobbyConfig) {
    if (!this.userId) {
      throw new Error("unauthorized");
    }

    LobbyConfigs.insert(lobbyConfig);
  }
});

export const updateLobbyConfig = new ValidatedMethod({
  name: "LobbyConfigs.methods.update",

  validate: LobbyConfigs.schema
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
    const lobbyConfig = LobbyConfigs.findOne(_id);
    if (!lobbyConfig) {
      throw new Error("not found");
    }

    const $set = {},
      $unset = {};
    if (name !== undefined) {
      $set.name = name;
    }
    if (archived !== undefined) {
      if (archived) {
        if (lobbyConfig.archivedAt) {
          throw new Error("not found");
        }

        $set.archivedAt = new Date();
        $set.archivedById = this.userId;
      }
      if (!archived) {
        if (!lobbyConfig.archivedAt) {
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

    LobbyConfigs.update(_id, modifier);
  }
});
