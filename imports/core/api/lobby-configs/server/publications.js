import { LobbyConfigs } from "../lobby-configs.js";

Meteor.publish("admin-lobby-configs", function({ archived }) {
  if (!this.userId) {
    return null;
  }

  if (archived === undefined) {
    return LobbyConfigs.find();
  }

  return LobbyConfigs.find({ archivedAt: { $exists: Boolean(archived) } });
});
