import { TimeSync } from "meteor/mizzao:timesync";
import { withTracker } from "meteor/react-meteor-data";
import moment from "moment";

import { PlayerRounds } from "../../api/player-rounds/player-rounds";
import { PlayerStages } from "../../api/player-stages/player-stages";
import { Players } from "../../api/players/players";
import { Rounds } from "../../api/rounds/rounds";
import { Stages } from "../../api/stages/stages";
import { Treatments } from "../../api/treatments/treatments.js";
import {
  augmentPlayerStageRound,
  augmentGameStageRound
} from "../../api/player-stages/augment";
import { stubPlayerStageRound } from "../../api/player-stages/augment.js";
import Game from "../components/Game";

const loadingObj = { loading: true };

// Handles all the timing stuff
const withTimer = withTracker(({ game, stage, player, ...rest }) => {
  // We no longer need timers if the game ended, skip the timing stuff.
  if (game && game.finishedAt) {
    return { game, stage, player };
  }

  // TimeSync.serverTime() is a reactive source that will trigger this
  // withTracker function every 1s.
  const now = moment(TimeSync.serverTime(null, 100));

  const startTimeAt = stage && stage.startTimeAt && moment(stage.startTimeAt);
  const started = startTimeAt && now.isSameOrAfter(startTimeAt);
  const endTimeAt =
    startTimeAt && startTimeAt.add(stage.durationInSeconds, "seconds");
  const ended = endTimeAt && now.isSameOrAfter(endTimeAt);
  const timedOut = stage && !player.stage.submitted && ended;
  const roundOver = (stage && player.stage.submitted) || timedOut;

  return {
    game,
    stage,
    player,
    timedOut,
    roundOver,
    started,
    ended,
    endTimeAt,
    ...rest
  };
})(Game);

// Handles all the info below game
const withGameInfo = withTracker(
  ({ game, gameLobby, player, treatment, ...rest }) => {
    if (!game) {
      return {
        gameLobby,
        player,
        treatment
      };
    }

    const gameId = game._id;
    treatment = Treatments.findOne(game.treatmentId);
    if (!treatment) {
      return loadingObj;
    }

    game.treatment = treatment.conditionsObject();
    game.players = Players.find({ gameId }).fetch();
    game.rounds = Rounds.find({ gameId }).fetch();
    game.rounds.forEach(round => {
      round.stages = Stages.find({ roundId: round._id }).fetch();
    });

    const stage = Stages.findOne(game.currentStageId);
    const round = game.rounds.find(r => r._id === stage.roundId);

    // We're having streaming updates from the backend that put us in an
    // uncertain state until everything is loaded correctly.
    const playerIds = game.players.map(p => p._id);
    const playerStagesCount = PlayerStages.find({
      stageId: stage._id,
      playerId: { $in: playerIds }
    }).count();
    const playerRoundsCount = PlayerRounds.find({
      roundId: round._id,
      playerId: { $in: playerIds }
    }).count();

    if (
      playerIds.length !== playerStagesCount ||
      playerIds.length !== playerRoundsCount
    ) {
      return loadingObj;
    }

    augmentGameStageRound(game, stage, round);
    const applyAugment = player => {
      player.stage = { _id: stage._id };
      player.round = { _id: round._id };
      augmentPlayerStageRound(player, player.stage, player.round);
    };
    applyAugment(player);
    game.players.forEach(applyAugment);

    const params = {
      game,
      round,
      stage,
      player,
      treatment,
      playerStagesCount,
      playerRoundsCount,
      ...rest
    };

    return params;
  }
)(withTimer);

// Loads top level Players, Game, Round and Stage data
export default withTracker(({ player, gameLobby, game, ...rest }) => {
  // If no game, we're at lobby level
  if (!game) {
    if (!gameLobby) {
      throw new Error("game not found");
    }
    const treatment = Treatments.findOne(gameLobby.treatmentId);
    if (!treatment) {
      return loadingObj;
    }

    stubPlayerStageRound(player);

    return {
      gameLobby,
      player,
      treatment
    };
  }

  return {
    game,
    player
  };
})(withGameInfo);
