import { ValidatedMethod } from "meteor/mdg:validated-method";
import SimpleSchema from "simpl-schema";

import { Batches } from "../batches/batches.js";
import { GameLobbies } from "../game-lobbies/game-lobbies";
import { IdSchema } from "../default-schemas.js";
import { LobbyConfigs } from "../lobby-configs/lobby-configs.js";
import { Players } from "./players";

export const createPlayer = new ValidatedMethod({
  name: "Players.methods.create",

  validate: new SimpleSchema({
    id: {
      type: String
    }
  }).validator(),

  run(player) {
    // TODO: MAYBE, add verification that the user is not current connected
    // elsewhere and this is not a flagrant impersonation. Note that is
    // extremely difficult to guaranty. Could also add verification of user's
    // id with email verication for example. For now the assumption is that
    // there is no immediate reason or long-term motiviation for people to hack
    // each other's player account.

    const existing = Players.findOne(player);

    // If the player already has a game lobby assigned, no need to
    // re-initialize them
    if (existing && existing.gameLobbyId) {
      return existing._id;
    }

    if (existing) {
      player = existing;
    } else {
      player._id = Players.insert(player);
    }

    // Find the first running batch (in order of running started time)
    const batch = Batches.findOne(
      { status: "running", full: false },
      { sort: { runningAt: 1 } }
    );

    if (!batch) {
      // The UI should update and realize there is no batch available
      // This should be a rare case where a fraction of a second of
      // desynchornisation when the last available batch just finished.
      // If this is the case, since the user exist in the DB at this point
      // but has no lobby assigned, and the UI will soon determine there
      // is no available game, the UI will switch to "No experiments
      // available", nothing else to do.
      return;
    }

    // Looking for all lobbies for batch (for which that game has not started yet)
    const lobbies = GameLobbies.find({
      batchId: batch._id,
      status: "running",
      timedOutAt: { $exists: false }
    }).fetch();

    if (lobbies.length === 0) {
      // This is the same case as when there are no batches available.
      return;
    }

    // Let's first try to find lobbies for which their queue isn't full yet
    let lobbyPool = lobbies.filter(l => l.availableCount > l.queuedCount);
    // If no lobbies still have "availability", just fill any lobby
    if (lobbyPool.length === 0) {
      lobbyPool = lobbies;
    }

    // Choose a random lobby in the available pool
    const lobby = _.shuffle(lobbyPool)[0];

    // Adding the player to specified lobby queue
    GameLobbies.update(lobby._id, {
      $addToSet: {
        queuedPlayerIds: player._id
      }
    });

    const gameLobbyId = lobby._id;
    const $set = { gameLobbyId };

    // Check if there will be instructions
    let skipInstructions = lobby.debugMode;

    // If there are no instruction, mark the player as ready immediately
    if (skipInstructions) {
      $set.readyAt = new Date();
    }

    Players.update(player._id, { $set });

    // If there are no instruction, player is ready, notify the lobby
    if (skipInstructions) {
      GameLobbies.update(gameLobbyId, {
        $inc: { readyCount: 1 },
        $addToSet: { playerIds: player._id }
      });
    }

    return player._id;
  }
});

export const playerReady = new ValidatedMethod({
  name: "Players.methods.ready",

  validate: IdSchema.validator(),

  run({ _id }) {
    try {
      // TODO: MAYBE, add verification that the user is not current connected
      // elsewhere and this is not a flagrant impersonation. Note that is
      // extremely difficult to guaranty. Could also add verification of user's
      // id with email verication for example. For now the assumption is that
      // there is no immediate reason or long-term motiviation for people to hack
      // each other's player account.

      const player = Players.findOne(_id);

      if (!player) {
        throw `unknown ready player: ${_id}`;
      }
      const { readyAt, gameLobbyId } = player;

      if (readyAt) {
        // Already ready
        return;
      }

      // Loop while trying to book a spot on lobby
      // We need to make sure the booking of slots on the game are not above
      // the number of available slots, so we try to add the user with a known
      // readyCount. If the update does not happen, the readyCount was changed
      // by another thread (another process...) and we should try again until
      // there are no slots left.
      // If no slots are left, we marked the player's attempt to participate as
      // failed, with a reason why. They will be led to the outro.
      while (true) {
        const lobby = GameLobbies.findOne(gameLobbyId);
        if (!lobby) {
          throw `unknown lobby for ready player: ${_id}`;
        }

        // Game is Full, bail the player
        if (lobby.readyCount === lobby.availableCount) {
          // User already ready, something happened out of order
          if (lobby.playerIds.includes(_id)) {
            return;
          }

          // Mark the player's participation attemp as failed
          Players.update(_id, {
            $set: {
              exitAt: new Date(),
              exitStatus: "gameFull"
            }
          });
          return;
        }

        // Try to upda the GameLobby with the readyCount we just queried.
        GameLobbies.update(
          { _id: gameLobbyId, readyCount: lobby.readyCount },
          {
            $inc: { readyCount: 1 },
            $addToSet: { playerIds: _id }
          }
        );

        // If it failed (playerId not added to playerIds), the readyCount has
        // changed since it was queried and the lobby might not have any available
        // slots left, loop and retry.
        const lobbyUpdated = GameLobbies.findOne(gameLobbyId);
        if (lobbyUpdated.playerIds.includes(_id)) {
          // If it did work, mark player as ready
          $set = { readyAt: new Date() };

          // If it's an individual lobby timeout, mark the first timer as started.
          const lobbyConfig = LobbyConfigs.findOne(lobbyUpdated.lobbyConfigId);
          if (lobbyConfig.timeoutType === "individual") {
            $set.timeoutStartedAt = new Date();
            $set.timeoutWaitCount = 1;
          }

          Players.update(_id, { $set });
          return;
        }
      }
    } catch (error) {
      console.error("Players.methods.ready", error);
    }
  }
});

export const updatePlayerData = new ValidatedMethod({
  name: "Players.methods.updateData",

  validate: new SimpleSchema({
    playerId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    key: {
      type: String
    },
    value: {
      type: String
    }
  }).validator(),

  run({ playerId, key, value }) {
    const player = Players.findOne(playerId);
    if (!player) {
      throw new Error("player not found");
    }
    // TODO check can update this record player

    const val = JSON.parse(value);
    const $set = {
      [`data.${key}`]: val
    };

    Players.update(playerId, { $set }, { autoConvert: false });
  }
});

export const markPlayerExitStepDone = new ValidatedMethod({
  name: "Players.methods.markExitStepDone",

  validate: new SimpleSchema({
    playerId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    },
    stepName: {
      type: String
    }
  }).validator(),

  run({ playerId, stepName }) {
    const player = Players.findOne(playerId);
    if (!player) {
      throw new Error("player not found");
    }
    // TODO check can update this record player

    Players.update(playerId, { $addToSet: { exitStepsDone: stepName } });
  }
});

export const extendPlayerTimeoutWait = new ValidatedMethod({
  name: "Players.methods.extendTimeoutWait",

  validate: new SimpleSchema({
    playerId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    }
  }).validator(),

  run({ playerId }) {
    const player = Players.findOne(playerId);
    if (!player) {
      throw new Error("player not found");
    }

    Players.update(playerId, {
      $inc: { timeoutWaitCount: 1 },
      $set: { timeoutStartedAt: new Date() }
    });
  }
});

export const endPlayerTimeoutWait = new ValidatedMethod({
  name: "Players.methods.endTimeoutWait",

  validate: new SimpleSchema({
    playerId: {
      type: String,
      regEx: SimpleSchema.RegEx.Id
    }
  }).validator(),

  run({ playerId }) {
    const player = Players.findOne(playerId);
    if (!player) {
      throw new Error("player not found");
    }

    Players.update(playerId, {
      $set: {
        exitStatus: "playerEndedLobbyWait",
        exitAt: new Date()
      }
    });
    GameLobbies.update(player.gameLobbyId, {
      $inc: { readyCount: -1, queuedCount: -1 },
      $pull: {
        playerIds: playerId
        // We keep the player in queued so they will still have it loaded in the UI
        // queuedPlayerIds: playerId
      }
    });
  }
});
