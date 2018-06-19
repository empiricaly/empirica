import moment from "moment";

import { GameLobbies } from "../game-lobbies.js";
import { LobbyConfigs } from "../../lobby-configs/lobby-configs";
import { Players } from "../../players/players.js";
import { createGameFromLobby } from "../../games/create.js";
import Cron from "../../../startup/server/cron.js";

const checkLobbyTimeout = (log, lobby, lobbyConfig) => {
  // Timeout hasn't started yet
  if (!lobby.timeoutStartedAt) {
    return;
  }

  const now = moment();
  const startTimeAt = moment(lobby.timeoutStartedAt);
  const endTimeAt = startTimeAt.add(lobbyConfig.timeoutInSeconds, "seconds");
  const ended = now.isSameOrAfter(endTimeAt);

  if (!ended) {
    return;
  }

  switch (lobbyConfig.timeoutStrategy) {
    case "fail":
      GameLobbies.update(lobby._id, {
        $set: { timedOutAt: new Date() }
      });
      Players.update(
        { _id: { $in: lobby.queuedPlayerIds } },
        {
          $set: {
            exitStatus: "gameLobbyTimedOut",
            exitAt: new Date()
          }
        },
        { multi: true }
      );
      break;
    case "ignore":
      createGameFromLobby(lobby);
      break;

    // case "bots": {

    //   break;
    // }

    default:
      log.error(
        `unknown LobbyConfig.timeoutStrategy: ${lobbyConfig.timeoutStrategy}`
      );
  }
};

const checkIndividualTimeout = (log, lobby, lobbyConfig) => {
  const now = moment();
  Players.find({ _id: { $in: lobby.playerIds } }).forEach(player => {
    const startTimeAt = moment(player.timeoutStartedAt);
    const endTimeAt = startTimeAt.add(lobbyConfig.timeoutInSeconds, "seconds");
    const ended = now.isSameOrAfter(endTimeAt);
    if (!ended || player.timeoutWaitCount <= lobbyConfig.extendCount) {
      return;
    }
    Players.update(player._id, {
      $set: {
        exitStatus: "playerLobbyTimedOut",
        exitAt: new Date()
      }
    });
    GameLobbies.update(lobby._id, {
      $pull: {
        playerIds: player._id
        // We keep the player in queuedPlayerIds so they will still have the
        // fact they were in a lobby available in the UI, and so we can show
        // them the exit steps.
      }
    });
  });
};

Cron.add({
  name: "Check lobby timeouts",
  interval: 1000,
  task: function(log) {
    const query = {
      status: "running",
      gameId: { $exists: false },
      timedOutAt: { $exists: false }
    };

    GameLobbies.find(query).forEach(lobby => {
      const lobbyConfig = LobbyConfigs.findOne(lobby.lobbyConfigId);

      switch (lobbyConfig.timeoutType) {
        case "lobby":
          checkLobbyTimeout(log, lobby, lobbyConfig);
          break;
        case "individual":
          checkIndividualTimeout(log, lobby, lobbyConfig);
          break;
        default:
          log.error(
            `unknown LobbyConfig.timeoutType: ${lobbyConfig.timeoutType}`
          );
      }
    });
  }
});
