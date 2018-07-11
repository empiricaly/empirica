import moment from "moment";

import { GameLobbies } from "../game-lobbies/game-lobbies.js";
import { Games } from "./games";
import { PlayerRounds } from "../player-rounds/player-rounds";
import { PlayerStages } from "../player-stages/player-stages";
import { Players } from "../players/players";
import { Rounds } from "../rounds/rounds";
import { Stages } from "../stages/stages";
import {
  augmentPlayerStageRound,
  augmentGameStageRound
} from "../player-stages/augment.js";
import { config } from "../../../experiment/server";

export const createGameFromLobby = gameLobby => {
  if (Games.find({ gameLobbyId: gameLobby._id }).count() > 0) {
    return;
  }

  const players = gameLobby.players();

  const batch = gameLobby.batch();
  const treatment = gameLobby.treatment();
  const conditions = treatment.conditionsObject();
  const { batchId, treatmentId, status, debugMode } = gameLobby;

  players.forEach(player => {
    player.data = {};
    player.set = (key, value) => {
      player.data[key] = value;
    };
    player.get = key => {
      return player.data[key];
    };
  });

  // Ask (experimenter designer) init function to configure this game
  // given the conditions and players given.
  const params = config.init(conditions, players);

  // Extract top level data fields into the the data subfield
  params.data = _.omit(params, "players", "rounds");

  // Keep debug mode from lobby
  params.debugMode = debugMode;

  // We need to create/configure stuff associated with the game before we
  // create it so we generate the id early
  const gameId = Random.id();
  params._id = gameId;
  params.gameLobbyId = gameLobby._id;
  // We also add a few related objects
  params.treatmentId = treatmentId;
  params.batchId = batchId;
  params.status = status;

  // playerIds is the reference to players stored in the game object
  params.playerIds = _.pluck(params.players, "_id");
  // We then need to verify all these ids exist and are unique, the
  // init function might not have returned them correctly
  const len = _.uniq(_.compact(params.playerIds)).length;
  if (len !== params.players.length || len !== players.length) {
    throw new Error("invalid player count");
  }

  // We want to copy over the changes made by the init function and save the
  // gameId in the player objects already in the DB
  params.players.forEach(({ _id, data }) => {
    Players.update(_id, { $set: { gameId, data } });
  });

  // Create the round objects
  let stageIndex = 0;
  let totalDuration = 0;
  let firstRoundId;
  params.roundIds = params.rounds.map((round, index) => {
    // Extract top level data fields into the the data subfield
    round.data = _.omit(round, "stages");

    const roundId = Rounds.insert(_.extend({ gameId, index }, round));
    const stageIds = round.stages.map(stage => {
      // Extract top level data fields into the the data subfield
      stage.data = _.omit(stage, "name", "displayName", "durationInSeconds");

      if (batch.debugMode) {
        stage.durationInSeconds = 60 * 60; // Stage time in debugMode is 1h
      }
      totalDuration += stage.durationInSeconds;
      const sParams = _.extend({ gameId, roundId, index: stageIndex }, stage);
      const stageId = Stages.insert(sParams);
      stageIndex++;
      if (!params.currentStageId) {
        firstRoundId = roundId;
        params.currentStageId = stageId;
      }
      const playerStageIds = params.players.map(({ _id: playerId }) => {
        return PlayerStages.insert({
          playerId,
          stageId,
          roundId,
          gameId,
          batchId
        });
      });
      Stages.update(stageId, { $set: { playerStageIds } });
      return stageId;
    });
    const playerRoundIds = params.players.map(({ _id: playerId }) => {
      return PlayerRounds.insert({
        playerId,
        roundId,
        gameId,
        batchId
      });
    });
    Rounds.update(roundId, { $set: { stageIds, playerRoundIds } });
    return roundId;
  });

  // An estimation of the finish time to help querying.
  // At the moment, this will 100% break with pausing the game/batch.
  params.estFinishedTime = moment()
    .add(totalDuration + 300, "seconds") // Give it a 5min window for sync
    .toDate();

  // Insert game. As soon as it comes online, the game will start for the
  // players so all related object (rounds, stages, players) must be created
  // and ready
  Games.insert(params);

  // Let Game Lobby know Game ID
  GameLobbies.update(gameLobby._id, { $set: { gameId } });

  const failedPlayerIds = _.difference(
    gameLobby.queuedPlayerIds,
    gameLobby.playerIds
  );

  // Notify players that didn't make the cut
  Players.update(
    { _id: { $in: failedPlayerIds } },
    {
      $set: {
        exitAt: new Date(),
        exitStatus: "gameFull"
      }
    },
    { multi: true }
  );

  const { onRoundStart, onGameStart, onStageStart } = config;
  if ((onGameStart || onRoundStart || onStageStart) && firstRoundId) {
    const game = Games.findOne(gameId);
    const players = Players.find({
      _id: { $in: params.playerIds }
    }).fetch();
    game.treatment = treatment.conditionsObject();
    game.players = players;
    game.rounds = Rounds.find({ gameId }).fetch();
    game.rounds.forEach(round => {
      round.stages = Stages.find({ roundId: round._id }).fetch();
    });
    const nextRound = game.rounds.find(r => r._id === firstRoundId);
    const nextStage = nextRound.stages.find(
      s => s._id === params.currentStageId
    );

    augmentGameStageRound(game, nextStage, nextRound);
    players.forEach(player => {
      player.round = _.extend({}, nextRound);
      player.stage = _.extend({}, nextStage);
      augmentPlayerStageRound(player, player.stage, player.round);
    });

    if (onGameStart) {
      onGameStart(game, players);
    }
    if (onRoundStart) {
      onRoundStart(game, nextRound, players);
    }
    if (onStageStart) {
      onStageStart(game, nextRound, nextStage, players);
    }
  }

  const startTimeAt = moment()
    .add(Stages.stagePaddingDuration)
    .toDate();

  Stages.update(params.currentStageId, {
    $set: {
      startTimeAt
    }
  });
};
