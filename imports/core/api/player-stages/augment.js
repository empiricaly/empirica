import { PlayerRounds } from "../player-rounds/player-rounds";
import { PlayerStages } from "./player-stages";
import { Players } from "../players/players.js";
import { submitPlayerStage, updatePlayerStageData } from "./methods";
import { updatePlayerData } from "../players/methods";
import { updatePlayerRoundData } from "../player-rounds/methods";

const playerSet = playerId => (key, value) => {
  updatePlayerData.call({
    playerId,
    key,
    value: JSON.stringify(value)
  });
};
const stageSet = playerStageId => (key, value) => {
  updatePlayerStageData.call({
    playerStageId,
    key,
    value: JSON.stringify(value)
  });
};
const stageSubmit = playerStageId => cb => {
  submitPlayerStage.call({ playerStageId }, cb);
};
const roundSet = playerRoundId => (key, value) => {
  updatePlayerRoundData.call({
    playerRoundId,
    key,
    value: JSON.stringify(value)
  });
};

// Once the operation has succeeded (no throw), set the value
// undefined is not supported, null is, replace undefineds by nulls.
const set = (obj, func) => (k, v) => {
  const val = v === undefined ? null : v;
  func(k, val);
  obj[k] = val;
};

const nullFunc = () => {
  throw "You called .get(...) or .set(...) but there is no data for the player yet. Did the game run for this player?";
};

export const augmentPlayerStageRound = (player, stage, round) => {
  const { _id: playerId } = player;

  player.get = key => player.data[key];
  player.set = set(player.data, playerSet(playerId));

  if (stage) {
    const playerStage = PlayerStages.findOne({ stageId: stage._id, playerId });
    stage.get = key => playerStage.data[key];
    stage.set = set(playerStage.data, stageSet(playerStage._id));
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
  }
};

export const stubPlayerStageRound = (player, stage, round) => {
  player.get = nullFunc;
  player.set = nullFunc;

  if (stage) {
    stage.get = nullFunc;
    stage.set = nullFunc;
    stage.submit = nullFunc;
    stage.submitted = false;
  }

  if (round) {
    round.get = nullFunc;
    round.set = nullFunc;
  }
};

export const augmentStageRound = (stage, round) => {
  if (stage) {
    stage.get = key => {
      return state.data[key];
    };
    stage.set = (key, value) => {
      throw "You cannot update stage data at the moment";
    };
    stage.submit = () => {
      throw "You cannot submit the entire stage at the moment";
    };
  }

  if (round) {
    round.get = key => {
      return round.data[key];
    };
    round.set = (key, value) => {
      throw "You cannot update round data at the moment";
    };
  }
};

export const stubStageRound = (stage, round) => {
  stage.get = nullFunc;
  stage.set = nullFunc;
  stage.submit = nullFunc;
  round.get = nullFunc;
  round.set = nullFunc;
};
