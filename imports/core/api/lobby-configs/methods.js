import { ValidatedMethod } from "meteor/mdg:validated-method";

import { LobbyConfigs } from "./lobby-configs.js";

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
