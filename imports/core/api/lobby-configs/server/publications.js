import { LobbyConfigs } from "../lobby-configs.js";

Meteor.publish("admin-lobby-configs", function() {
  if (!this.userId) {
    return null;
  }
  return LobbyConfigs.find();
});
