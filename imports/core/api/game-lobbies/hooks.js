import { GameLobbies } from "../game-lobbies/game-lobbies";
import { Games } from "../games/games";
import { LobbyConfigs } from "../lobby-configs/lobby-configs.js";
import { Players } from "../players/players.js";
import { createGameFromLobby } from "../games/create";

import { checkBatchFull, checkForBatchFinished } from "../games/hooks.js";

// Check if batch is full or the game finished if this lobby timed out
GameLobbies.after.update(function(
  userId,
  { batchId },
  fieldNames,
  modifier,
  options
) {
  if (!fieldNames.includes("timedOutAt")) {
    return;
  }

  checkBatchFull(batchId);
  checkForBatchFinished(batchId);
});

// Start the game if lobby full
GameLobbies.after.update(
  function(userId, doc, fieldNames, modifier, options) {
    if (!fieldNames.includes("readyCount")) {
      return;
    }

    const gameLobby = this.transform();

    // If the lobby timeout it hasn't started yet and the lobby isn't full yet
    // (single player), try to start the timeout timer.
    if (
      gameLobby.readyCount > 0 &&
      gameLobby.availableCount != 1 &&
      !gameLobby.timeoutStartedAt
    ) {
      const lobbyConfig = LobbyConfigs.findOne(gameLobby.lobbyConfigId);
      if (lobbyConfig.timeoutType === "lobby") {
        GameLobbies.update(gameLobby._id, {
          $set: { timeoutStartedAt: new Date() }
        });
      }
    }

    // If the readyCount went to 0 (disconnections for example), reset the
    // lobby timeout.
    if (gameLobby.readyCount === 0 && gameLobby.timeoutStartedAt) {
      const lobbyConfig = LobbyConfigs.findOne(gameLobby.lobbyConfigId);
      if (lobbyConfig.timeoutType === "lobby") {
        GameLobbies.update(gameLobby._id, {
          $unset: { timeoutStartedAt: "" }
        });
      }
    }

    // If there are not enough players ready, wait
    if (gameLobby.readyCount < gameLobby.availableCount) {
      return;
    }

    // Game already created (?!)
    if (Games.find({ gameLobbyId: gameLobby._id }).count() > 0) {
      return;
    }

    // Create Game
    createGameFromLobby(gameLobby);
  },
  { fetchPrevious: false }
);
