import { Games } from "../games/games.js";
import { Players } from "../players/players.js";
import { Rounds } from "../rounds/rounds.js";
import { Stages } from "../stages/stages.js";
import { Treatments } from "../treatments/treatments.js";
import {
  augmentGameStageRound,
  augmentPlayerStageRound
} from "../player-stages/augment.js";
import { config } from "../../../experiment/server";

const targets = {
  playerStageId: "playerStage",
  playerRoundId: "playerRound",
  stageId: "stage",
  roundId: "round",
  gameId: "game"
};

// Central point for triggering the onSet, onAppend and onChange callbacks.
// These callbacks are called when the experiment code calls custom data update
// methods on games, rounds, stages, players, playerRounds or playerStages.
// onSet is called when the .set() method is used.
// onAppend is called when the .append() method is used.
// onChange is called when the .set() or .append() method is used.
export const callOnChange = params => {
  const cbName = params.append ? "onAppend" : "onSet";
  const { onChange, [cbName]: onSetAppend } = config;
  const callbacks = [];
  if (onSetAppend) {
    callbacks.push(onSetAppend);
  }
  if (onChange) {
    callbacks.push(onChange);
  }
  if (callbacks.length === 0) {
    return;
  }

  let target = params.player,
    targetType = "player";
  for (const key in targets) {
    if (params[key]) {
      targetType = targets[key];
      target = params[targets[key]];
      // Update field to latest value
      if (params.append) {
        if (!target.data[params.key]) {
          target.data[params.key] = [params.value];
        } else {
          target.data[params.key] = target.data[params.key].slice(0);
          target.data[params.key].push(params.value);
        }
      } else {
        target.data[params.key] = params.value;
      }
      break;
    }
  }

  let { player, game, round, stage } = params;

  console.log("params", params);

  player = player || Players.findOne(params.playerId);
  game = game || Games.findOne(player.gameId);
  if (!game) {
    console.error(`${targetType} data updated without game`);
    return;
  }
  stage = stage || Stages.findOne(game.currentStageId);
  if (!stage) {
    console.error(`${targetType} data updated without stage`);
    return;
  }

  const { gameId, roundId } = stage;
  round = round || Rounds.findOne(roundId);
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

  callbacks.forEach(callback => {
    callback(
      game,
      round,
      stage,
      players,
      player,
      target,
      targetType,
      params.key,
      params.value,
      params.prevValue,
      params.append // for onChange
    );
  });
};
