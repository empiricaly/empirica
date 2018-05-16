import { Players } from "../players.js";
import { savePlayerId } from "../../../startup/server/connections.js";

Meteor.publish("playerInfo", function({ playerId }) {
  const playerExists = Players.find(playerId).count() > 0;
  if (playerExists) {
    savePlayerId(this.connection.id, playerId);
  }
  return Players.find(playerId);
});
