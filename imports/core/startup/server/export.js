import moment from "moment";

import { Conditions } from "../../api/conditions/conditions.js";
import { Games } from "../../api/games/games.js";
import { PlayerInputs } from "../../api/player-inputs/player-inputs.js";
import { PlayerRounds } from "../../api/player-rounds/player-rounds.js";
import { PlayerStages } from "../../api/player-stages/player-stages.js";
import { Players } from "../../api/players/players.js";
import { Rounds } from "../../api/rounds/rounds.js";
import { Stages } from "../../api/stages/stages.js";
import { Treatments } from "../../api/treatments/treatments.js";

//
// WARNING!!!
// The export endpoint is not protected!!
//

// WebApp.connectHandlers.use(
//   "/export",
//   WebAppInternals.NpmModules.connect.module.basicAuth((u, p) => {
//     return u === "admin" && p === "admin";
//   }, "export")
// );

export const BOM = "\uFEFF";

// Get all possible keys in the data field of collections that have a data field
// such as Players, PlayerStages and PlayerRounds.
const getDataKeys = coll => {
  const map = {};
  coll.find({}, { fields: { data: 1 } }).forEach(record => {
    _.keys(record.data).forEach(key => (map[key] = true));
  });
  return _.keys(map);
};

export const cast = out => {
  if (_.isArray(out)) {
    // The cast here will flatten arrays but will still catch dates correctly
    return out.map(a => cast(a)).join(",");
  }
  if (_.isDate(out)) {
    return moment(out)
      .utc()
      .format();
  }
  if (_.isObject(out)) {
    return JSON.stringify(out);
  }

  if (out === false || out === 0) {
    return out.toString();
  }
  return (out || "").toString();
};

export const quoteMark = '"';
export const doubleQuoteMark = '""';
export const quoteRegex = /"/g;

export const encodeCells = (line, delimiter = ",", newline = "\n") => {
  const row = line.slice(0);
  for (var i = 0, len = row.length; i < len; i++) {
    row[i] = cast(row[i]);
    if (row[i].indexOf(quoteMark) !== -1) {
      row[i] = row[i].replace(quoteRegex, doubleQuoteMark);
    }
    if (row[i].indexOf(delimiter) !== -1 || row[i].indexOf(newline) !== -1) {
      row[i] = quoteMark + row[i] + quoteMark;
    }
  }
  return row.join(delimiter) + newline;
};

const csvHeaders = [
  "batchId",
  "gameId",
  "playerId",
  "roundId",
  "stageId",
  "playerRoundId",
  "playerStageId",
  "round.index",
  "stage.index",
  "stage.name",
  "stage.duration"
];

const exportStages = format => (req, res, next) => {
  const withheld = req.query.withheld === "true";
  switch (format) {
    case "csv":
      res.writeHead(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "inline"
      });
      res.write(BOM);
      break;
    case "json":
      res.writeHead(200, { "Content-Type": "application/json" });
      break;
    default:
      throw "unknown export format";
      break;
  }

  const condRaw = Conditions.rawCollection();
  const condDistinct = Meteor.wrapAsync(condRaw.distinct, condRaw);
  const conditionTypes = condDistinct("type");
  const allConditions = Conditions.find().fetch();
  const getCond = id => allConditions.find(c => c._id === id);
  const playerKeys = getDataKeys(Players);
  const playerRoundKeys = getDataKeys(PlayerRounds);
  const playerStageKeys = getDataKeys(PlayerStages);
  const roundKeys = getDataKeys(Rounds);
  const stageKeys = getDataKeys(Stages);

  let inputsLen = 0;
  const inputsPerPlayer = {};
  PlayerInputs.find().forEach(input => {
    if (!inputsPerPlayer[input.playerId]) {
      inputsPerPlayer[input.playerId] = 0;
    }
    inputsPerPlayer[input.playerId] += 1;
    if (inputsPerPlayer[input.playerId] > inputsLen) {
      inputsLen = inputsPerPlayer[input.playerId];
    }
  });

  for (const key of roundKeys) {
    csvHeaders.push(`round.data.${key}`);
  }

  for (const key of stageKeys) {
    csvHeaders.push(`stage.data.${key}`);
  }

  for (const key of playerKeys) {
    csvHeaders.push(`player.data.${key}`);
  }

  for (const key of playerRoundKeys) {
    csvHeaders.push(`playerRound.data.${key}`);
  }

  for (const key of playerStageKeys) {
    csvHeaders.push(`playerStage.data.${key}`);
  }

  _.times(inputsLen, i => {
    csvHeaders.push(`data.${i}`);
  });

  if (format === "csv") {
    res.write(encodeCells(csvHeaders));
  }

  // Query of player stages to export
  const playerStagesCursor = PlayerStages.find(
    {},
    { sort: { gameId: 1, playerId: 1, createdAt: 1 } }
  );

  playerStagesCursor.forEach(playerStage => {
    const out = new Map();
    const player = Players.findOne(playerStage.playerId);
    const playerRound = PlayerRounds.findOne({
      playerId: playerStage.playerId,
      roundId: playerStage.roundId
    });
    const round = Rounds.findOne(playerStage.roundId);
    const stage = Stages.findOne(playerStage.stageId);
    const game = Games.findOne(playerStage.gameId);
    const treatment = Treatments.findOne(game.treatmentId);
    const inputs = PlayerInputs.find({
      playerId: playerStage.playerId
    }).fetch();

    out.set("batchId", playerStage.batchId);
    out.set("gameId", playerStage.gameId);
    out.set("playerId", playerStage.playerId);
    out.set("roundId", playerStage.roundId);
    out.set("stageId", playerStage.stageId);
    out.set("playerRoundId", playerRound._id);
    out.set("playerStageId", playerStage._id);

    const conditions = treatment.conditionIds.map(getCond);
    for (const type of conditionTypes) {
      const cond = conditions.find(c => c.type === type);
      out.set(`treatment.${type}`, cond && cond.value);
    }

    out.set(`round.index`, round.index);
    out.set(`stage.index`, stage.index);
    out.set(`stage.name`, stage.name);
    out.set(`stage.duration`, stage.duration);

    for (const key of roundKeys) {
      out.set(`round.data.${key}`, round.data[key]);
    }

    for (const key of stageKeys) {
      out.set(`stage.data.${key}`, stage.data[key]);
    }

    for (const key of playerKeys) {
      out.set(`player.data.${key}`, player.data[key]);
    }

    for (const key of playerRoundKeys) {
      out.set(`playerRound.data.${key}`, playerRound.data[key]);
    }

    for (const key of playerStageKeys) {
      out.set(`playerStage.data.${key}`, playerStage.data[key]);
    }

    _.times(inputsLen, i => {
      out.set(`data.${i}`, inputs[i] && inputs[i].data);
    });

    switch (format) {
      case "csv":
        res.write(encodeCells(mapToArr(out)));
        break;
      case "json":
        res.write(JSON.stringify(mapToObj(out)) + "\n");
        break;
      default:
        throw "unknown export format";
        break;
    }
  });

  res.end();
};

WebApp.connectHandlers.use("/admin/export.json", exportStages("json"));
WebApp.connectHandlers.use("/admin/export.csv", exportStages("csv"));

function mapToObj(map) {
  let obj = Object.create(null);
  for (let [k, v] of map) {
    obj[k] = v;
  }
  return obj;
}

function mapToArr(map) {
  let arr = [];
  let index = 0;
  for (let [k, v] of map) {
    arr[index] = v;
    index++;
  }
  return arr;
}
