import { Players } from "../players.js";
import { savePlayerId } from "../../../startup/server/connections.js";

Meteor.publish("playerInfo", function({ playerId }) {
  const selector = {
    _id: playerId,
    "data.archivedGameFullAt": { $exists: false }
  };
  const playerExists = Players.find(selector).count() > 0;
  if (playerExists) {
    savePlayerId(this.connection, playerId);
  }
  return Players.find(selector);
});

const clients = {};
let hasPlayers = false;

Meteor.startup(() => {
  let initializing = true;
  hasPlayers = Players.find().count() > 0;
  // `observeChanges` only returns after the initial `added` callbacks have run.
  // Until then, we don't want to send a lot of `changed` messages—hence
  // tracking the `initializing` state.
  const handle = Players.find({}, { fields: { _id: 1 } }).observeChanges({
    added: id => {
      if (initializing) {
        return;
      }
      if (Players.find().count() > 0 && !hasPlayers) {
        hasPlayers = true;
        for (const id in clients) {
          if (clients.hasOwnProperty(id)) {
            const client = clients[id];
            client.changed("hasPlayers", "id", { hasPlayers });
          }
        }
      }
    },

    removed: id => {
      if (Players.find().count() === 0 && hasPlayers) {
        hasPlayers = false;
        for (const id in clients) {
          if (clients.hasOwnProperty(id)) {
            const client = clients[id];
            client.changed("hasPlayers", "id", { hasPlayers });
          }
        }
      }
    }
  });

  initializing = false;
});

Meteor.publish(null, function() {
  clients[this.connection.id] = this;
  this.added("hasPlayers", "id", { hasPlayers });
  this.ready();
  this.onStop(() => delete clients[this.connection.id]);
});
