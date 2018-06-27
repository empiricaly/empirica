import { PlayerRounds } from "../player-rounds/player-rounds";
import { PlayerStages } from "./player-stages";
import { submitPlayerStage, updatePlayerStageData } from "./methods";
import { updateGameData } from "../games/methods.js";
import { updatePlayerData } from "../players/methods.js";
import { updatePlayerRoundData } from "../player-rounds/methods";
import { updateRoundData } from "../rounds/methods.js";
import { updateStageData } from "../stages/methods.js";

const gameSet = (gameId, append = false) => (key, value) => {
  updateGameData.call({
    gameId,
    key,
    value: JSON.stringify(value),
    append,
    noCallback: Meteor.isServer
  });
};
const playerSet = (playerId, append = false) => (key, value) => {
  updatePlayerData.call({
    playerId,
    key,
    value: JSON.stringify(value),
    append,
    noCallback: Meteor.isServer
  });
};
const stageSet = (playerStageId, append = false) => (key, value) => {
  updatePlayerStageData.call({
    playerStageId,
    key,
    value: JSON.stringify(value),
    append,
    noCallback: Meteor.isServer
  });
};
const stageSubmit = playerStageId => cb => {
  submitPlayerStage.call(
    {
      playerStageId,
      noCallback: Meteor.isServer
    },
    cb
  );
};
const roundSet = (playerRoundId, append = false) => (key, value) => {
  updatePlayerRoundData.call({
    playerRoundId,
    key,
    value: JSON.stringify(value),
    append,
    noCallback: Meteor.isServer
  });
};

// Once the operation has succeeded (no throw), set the value
// undefined is not supported, null is, replace undefineds by nulls.
const set = (obj, func) => (k, v) => {
  const val = v === undefined ? null : v;
  func(k, val);
  obj[k] = val;
};
const append = (obj, func) => (k, v) => {
  const val = v === undefined ? null : v;
  func(k, val);
  if (!obj[k]) {
    obj[k] = [];
  }
  obj[k].push(val);
};

const nullFunc = () => {
  throw "You called .get(...) or .set(...) but there is no data for the player yet. Did the game run for this player?";
};

export const augmentPlayerStageRound = (player, stage, round) => {
  const { _id: playerId } = player;

  player.get = key => player.data[key];
  player.set = set(player.data, playerSet(playerId));
  player.append = append(player.data, playerSet(playerId, true));

  if (stage) {
    const playerStage = PlayerStages.findOne({ stageId: stage._id, playerId });
    stage.get = key => playerStage.data[key];
    stage.set = set(playerStage.data, stageSet(playerStage._id));
    stage.append = append(playerStage.data, stageSet(playerStage._id, true));
    stage.submit = stageSubmit(playerStage._id, err => {
      if (!err) {
        stage.submitted = true;
      }
    });
    stage.submitted = Boolean(playerStage.submittedAt);
  }

  if (round) {
    const playerRound = PlayerRounds.findOne({ roundId: round._id, playerId });
    round.get = key => playerRound.data[key];
    round.set = set(playerRound.data, roundSet(playerRound._id));
    round.append = append(playerRound.data, roundSet(playerRound._id, true));
  }
};

export const stubPlayerStageRound = (player, stage, round) => {
  player.get = nullFunc;
  player.set = nullFunc;
  player.append = nullFunc;

  if (stage) {
    stage.get = nullFunc;
    stage.set = nullFunc;
    stage.append = nullFunc;
    stage.submit = nullFunc;
    stage.submitted = false;
  }

  if (round) {
    round.get = nullFunc;
    round.set = nullFunc;
    round.append = nullFunc;
  }
};

export const augmentGameStageRound = (game, stage, round) => {
  if (game) {
    game.get = key => game.data[key];
    game.set = set(game.data, gameSet(game._id));
    game.append = append(game.data, gameSet(game._id, true));
  }

  if (stage) {
    stage.get = key => {
      return stage.data[key];
    };
    stage.set = set(stage.data, (key, value) => {
      updateStageData.call({
        stageId: stage._id,
        key,
        value: JSON.stringify(value),
        append: false,
        noCallback: Meteor.isServer
      });
    });
    stage.append = append(stage.data, (key, value) => {
      updateStageData.call({
        stageId: stage._id,
        key,
        value: JSON.stringify(value),
        append: true,
        noCallback: Meteor.isServer
      });
    });
    stage.submit = () => {
      throw "You cannot submit the entire stage at the moment";
    };
  }

  if (round) {
    round.get = key => {
      return round.data[key];
    };
    round.set = set(round.data, (key, value) => {
      updateRoundData.call({
        roundId: round._id,
        key,
        value: JSON.stringify(value),
        append: false,
        noCallback: Meteor.isServer
      });
    });
    round.append = append(round.data, (key, value) => {
      updateRoundData.call({
        roundId: round._id,
        key,
        value: JSON.stringify(value),
        append: true,
        noCallback: Meteor.isServer
      });
    });
  }
};

export const stubStageRound = (stage, round) => {
  stage.get = nullFunc;
  stage.set = nullFunc;
  stage.append = nullFunc;
  stage.submit = nullFunc;
  round.get = nullFunc;
  round.set = nullFunc;
  round.append = nullFunc;
};
