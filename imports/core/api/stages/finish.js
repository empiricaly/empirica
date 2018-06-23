import moment from "moment";

import { Games } from "../games/games.js";
import { Players } from "../players/players.js";
import { Rounds } from "../rounds/rounds.js";
import { Stages } from "./stages.js";
import { Treatments } from "../treatments/treatments.js";
import {
  augmentPlayerStageRound,
  augmentGameStageRound
} from "../player-stages/augment.js";
import { config } from "../../../experiment/server";

export const endOfStage = stageId => {
  const stage = Stages.findOne(stageId);
  const { index, gameId, roundId } = stage;
  const game = Games.findOne(gameId);
  const round = Rounds.findOne(roundId);
  const players = Players.find({ gameId }).fetch();
  const treatment = Treatments.findOne(game.treatmentId);

  game.treatment = treatment.conditionsObject();
  game.players = players;
  game.rounds = Rounds.find({ gameId }).fetch();
  game.rounds.forEach(round => {
    round.stages = Stages.find({ roundId: round._id }).fetch();
  });

  augmentGameStageRound(game, stage, round);
  players.forEach(player => {
    player.stage = _.extend({}, stage);
    player.round = _.extend({}, round);
    augmentPlayerStageRound(player, player.stage, player.round);
  });

  const { onStageEnd, onRoundEnd, onRoundStart, onStageStart } = config;
  if (onStageEnd) {
    onStageEnd(game, round, stage, players);
  }

  const nextStage = Stages.findOne({ gameId, index: index + 1 });

  if ((onRoundEnd && !nextStage) || stage.roundId !== nextStage.roundId) {
    onRoundEnd(game, round, players);
  }

  if (nextStage && (onRoundStart || onStageStart)) {
    const nextRound = Rounds.findOne(nextStage.roundId);
    augmentGameStageRound(game, null, nextRound);
    players.forEach(player => {
      player.round = _.extend({}, nextRound);
      player.stage = _.extend({}, nextStage);
      augmentPlayerStageRound(player, null, player.round, player.stage);
    });

    if (onRoundStart && stage.roundId !== nextStage.roundId) {
      onRoundStart(game, nextRound, players);
    }

    if (onStageStart) {
      onStageStart(game, nextRound, nextStage, players);
    }
  }

  if (nextStage) {
    // go to next stage
    const currentStageId = nextStage._id;
    Games.update(gameId, {
      $set: { currentStageId }
    });
    const startTimeAt = moment().add(Stages.stagePaddingDuration);
    Stages.update(currentStageId, {
      $set: {
        startTimeAt: startTimeAt.toDate()
      }
    });
  } else {
    const onGameEnd = config.onGameEnd;
    if (onGameEnd) {
      onGameEnd(game, players);
    }
    Players.update(
      { _id: { $in: _.pluck(players, "_id"), $exists: { exitStatus: false } } },
      {
        $set: { exitStatus: "finished", exitAt: new Date() }
      },
      { multi: true }
    );
    Games.update(gameId, {
      $set: { finishedAt: new Date() }
    });
  }
};
