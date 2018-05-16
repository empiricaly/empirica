// See if everyone is done with this stage
import { Batches } from "../batches/batches";
import { GameLobbies } from "../game-lobbies/game-lobbies";
import { Games } from "../games/games";

export const checkBatchFull = batchId => {
  const batch = Batches.findOne(batchId);
  if (!batch) {
    throw `batch for game missing. batchId: ${batchId}`;
  }

  const expectedGamesCount = batch.gameCount();
  const gamesCount = Games.find({ batchId }).count();
  const timeOutGameLobbiesCount = GameLobbies.find({
    batchId,
    timedOutAt: { $exists: true }
  }).count();

  if (expectedGamesCount === gamesCount + timeOutGameLobbiesCount) {
    Batches.update(batchId, { $set: { full: true } });
  }
};

// If all games for batch are filled, change batch status
Games.after.insert(function(userId, { batchId }) {
  checkBatchFull(batchId);
});

export const checkForBatchFinished = batchId => {
  // Find games that are not finished
  const gameQuery = { batchId, finishedAt: { $exists: false } };
  const gamesCount = Games.find(gameQuery).count();
  const noGamesLeft = gamesCount === 0;

  // Find game lobbies that haven't been transformed into games and that haven't timedout
  const gameLobbiesQuery = {
    batchId,
    gameId: { $exists: false },
    timedOutAt: { $exists: false }
  };
  const lobbiesCount = GameLobbies.find(gameLobbiesQuery).count();
  const noGameLobbiesLeft = lobbiesCount === 0;

  if (noGamesLeft && noGameLobbiesLeft) {
    Batches.update(batchId, {
      $set: { status: "finished", finishedAt: new Date() }
    });
  }
};

// Check if all games finished, mark batch as finished
Games.after.update(
  function(userId, { batchId }, fieldNames, modifier, options) {
    if (!fieldNames.includes("finishedAt")) {
      return;
    }

    checkForBatchFinished(batchId);
  },
  { fetchPrevious: false }
);
