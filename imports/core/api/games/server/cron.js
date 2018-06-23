import moment from "moment";

import { Games } from "../games.js";
import { Players } from "../../players/players.js";
import { Rounds } from "../../rounds/rounds.js";
import { Stages } from "../../stages/stages.js";
import { Treatments } from "../../treatments/treatments.js";
import {
  augmentPlayerStageRound,
  augmentGameStageRound
} from "../../player-stages/augment.js";
import { config } from "../../../../experiment/server";
import { endOfStage } from "../../stages/finish.js";
import Cron from "../../../startup/server/cron.js";

Cron.add({
  name: "Trigger stage timeout or Run bots",
  interval: 1000,
  task: function(log) {
    const query = {
      status: "running",
      estFinishedTime: { $gte: new Date() }
    };
    Games.find(query).forEach(game => {
      const stage = Stages.findOne(game.currentStageId);

      const now = moment();
      const startTimeAt = moment(stage.startTimeAt);
      const endTimeAt = startTimeAt.add(stage.durationInSeconds, "seconds");
      const ended = now.isSameOrAfter(endTimeAt);
      if (ended) {
        endOfStage(stage._id);
      } else {
        const { gameId } = stage;
        // make bots play
        const query = { gameId, bot: { $exists: true } };
        if (Players.find(query).count() === 0) {
          return;
        }
        const botPlayers = Players.find(query);
        const players = Players.find({ gameId }).fetch();
        const treatment = Treatments.findOne(game.treatmentId);
        const round = Rounds.findOne(stage.roundId);
        game.treatment = treatment.conditionsObject();
        game.players = players;
        game.rounds = Rounds.find({ gameId }).fetch();
        game.stages = Stages.find({ gameId }).fetch();

        botPlayers.forEach(botPlayer => {
          const bot = config.bots[botPlayer.bot];
          if (!bot) {
            log.error(
              `Definition for bot "${
                botPlayer.bot
              }" was not found in the server config!`
            );
            return;
          }

          if (!bot.onStageTick) {
            return;
          }

          augmentGameStageRound(game, stage, round);
          players.forEach(player => {
            player.stage = _.extend({}, stage);
            player.round = _.extend({}, round);
            augmentPlayerStageRound(player, player.stage, player.round);
          });

          botPlayer.stage = _.extend({}, stage);
          botPlayer.round = _.extend({}, round);
          augmentPlayerStageRound(botPlayer, botPlayer.stage, botPlayer.round);

          const tick = endTimeAt.diff(now, "seconds");

          game.rounds.forEach(round => {
            round.stages = game.stages.filter(s => s.roundId === round._id);
          });

          bot.onStageTick(botPlayer, game, round, stage, players, tick);
        });
      }
    });
  }
});
