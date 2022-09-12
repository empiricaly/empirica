import { State } from "@empirica/tajriba";
import { z } from "zod";
import { Attribute } from "../../shared/attributes";
import { debug, error, trace, warn } from "../../utils/console";
import { deepEqual } from "../../utils/object";
import { pickRandom, selectRandom } from "../../utils/random";
import { EventContext, ListenersCollector, TajribaEvent } from "../events";
import { Participant } from "../participants";
import { Step, Transition } from "../transitions";
import { attrs } from "./helpers";
import {
  Batch,
  ClassicKinds,
  Context,
  evt,
  Game,
  Player,
  PlayerStage,
  Round,
  Stage,
} from "./models";
import { batchConfigSchema, treatmentSchema } from "./schemas";

// const isBatch = z.instanceof(Batch).parse;
const isGame = z.instanceof(Game).parse;
const isRound = z.instanceof(Round).parse;
const isStage = z.instanceof(Stage).parse;
const isString = z.string().parse;

export type ClassicConfig = {
  disableAssignment?: boolean;
};

export function Classic(config: ClassicConfig = {}) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    const online = new Map<string, Participant>();
    const playersForParticipant = new Map<string, Player>();
    const stageForStepID = new Map<string, Stage>();

    async function assignplayer(
      ctx: EventContext<Context, ClassicKinds>,
      player: Player,
      skipGameIDs?: string[]
    ) {
      if (config.disableAssignment) {
        return;
      }

      if (player.get("gameID")) {
        return;
      }

      for (const batch of evt(ctx).batches) {
        if (!batch.isRunning) {
          continue;
        }

        let availableGames = [];

        for (const game of batch.games) {
          if (
            game.hasNotStarted &&
            (!skipGameIDs || !skipGameIDs?.includes(game.id))
          ) {
            availableGames.push(game);
          }
        }

        if (availableGames.length === 0) {
          continue;
        }

        if (player.get("treatment")) {
          availableGames = availableGames.filter((g) =>
            deepEqual(g.get("treatment"), player.get("treatment"))
          );
        }

        if (availableGames.length === 0) {
          continue;
        }

        const game = pickRandom(availableGames);

        await game.assignPlayer(player);

        return;
      }

      if (player.get("gameID") !== undefined) {
        player.set("ended", "no more games");
      }
    }

    function checkShouldOpenExperiment(
      ctx: EventContext<Context, ClassicKinds>
    ) {
      let shouldOpenExperiment = false;

      LOOP: for (const batch of evt(ctx).batches) {
        if (!batch.isRunning) {
          continue;
        }

        for (const game of batch.games) {
          if (game.hasNotStarted) {
            shouldOpenExperiment = true;
            break LOOP;
          }
        }
      }

      ctx.globals.set("experimentOpen", shouldOpenExperiment);
    }

    function tryToStartGame(
      ctx: EventContext<Context, ClassicKinds>,
      game: Game
    ) {
      if (game.get("stageID")) return;

      if (game.stages.length === 0) {
        return;
      }

      const groupID = isString(game.get("groupID"));

      const participantIDs: string[] = [];
      const nodeIDs = [game.id, groupID];
      for (const player of game.players) {
        nodeIDs.push(player.id);
        participantIDs.push(player.participantID!);
        const playerGameID = player.get(`playerGameID-${game.id}`) as
          | string
          | undefined;

        // NOTE: this is not right. This means we're aborting because we're not
        // ready, but the trigger playerGameID-GAMEID is not a trigger to
        // attempt starting the game again, so sometimes we might not start the
        // game. I think. So far, it does not happen in the tests, but it seems
        // like it could. TBD.
        if (!playerGameID) {
          return;
        }
        nodeIDs.push(playerGameID);
      }

      ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

      const stage = isStage(game.stages[0]);
      const round = isRound(stage.round);

      game.set("stageID", stage.id);

      round.set("start", true);
    }

    _.on(TajribaEvent.ParticipantConnect, async (ctx, { participant }) => {
      // console.log("ON PARTICIPANT", participant.id);
      online.set(participant.id, participant);

      const player = playersForParticipant.get(participant.id);

      if (!player) {
        // console.log("CREATE PLAYER", participant.id);
        await ctx.addScopes([
          {
            attributes: attrs([
              {
                key: "participantID",
                value: participant.id,
                immutable: true,
              },
            ]),
            kind: "player",
          },
        ]);
      } else {
        // console.log("ALREADY", participant.id, player.id);
        await assignplayer(ctx, player);
      }
    });

    _.on(TajribaEvent.ParticipantDisconnect, (_, { participant }) => {
      online.delete(participant.id);
    });

    _.on("player", async (ctx, { player }: { player: Player }) => {
      // console.log("ON PLAYER", player.id);
      const participantID = isString(player.get("participantID"));

      player.participantID = participantID;
      playersForParticipant.set(participantID, player);

      ctx.addLinks([
        {
          link: true,
          participantIDs: [player.participantID!],
          nodeIDs: [player.id],
        },
      ]);

      if (online.has(participantID)) {
        await assignplayer(ctx, player);
      }
    });

    _.on("batch", (_, { batch }: { batch: Batch }) => {
      if (batch.get("initialized")) {
        return;
      }

      batch.set("initialized", true);

      const config = batchConfigSchema.parse(batch.get("config"));

      switch (config.kind) {
        case "simple":
          for (let i = 0; i < config.config.count; i++) {
            const treatment = pickRandom(config.config.treatments).factors;
            batch.addGame([
              {
                key: "treatment",
                value: treatment,
                immutable: true,
              },
            ]);
          }

          break;
        case "complete":
          for (const t of config.config.treatments) {
            for (let i = 0; i < t.count; i++) {
              batch.addGame([
                {
                  key: "treatment",
                  value: t.treatment.factors,
                  immutable: true,
                },
              ]);
            }
          }

          break;
        default:
          warn("callbacks: batch created without a config");

          return;
      }
    });

    type BatchStatus = { batch: Batch; status: string };
    _.unique.on(
      "batch",
      "status",
      async (ctx, { batch, status }: BatchStatus) => {
        switch (status) {
          case "running": {
            for (const [_, player] of playersForParticipant) {
              if (player.participantID) {
                await assignplayer(ctx, player);
              }
            }

            checkShouldOpenExperiment(ctx);
            break;
          }
          case "terminated":
            for (const game of batch.games) {
              game.end(status, "batch ended");
            }

            checkShouldOpenExperiment(ctx);

            break;

          case "ended":
            checkShouldOpenExperiment(ctx);

            break;
          default:
            warn("unknown batch status:", status);

            break;
        }
      }
    );

    type GameStatus = { game: Game; status: string };
    _.unique.on("game", "status", (ctx, { game, status }: GameStatus) => {
      switch (status) {
        case "running": {
          tryToStartGame(ctx, game);
          checkShouldOpenExperiment(ctx);

          break;
        }

        case "ended":
        case "terminated":
          for (const player of game.players) {
            player.set("ended", `game ${status}`);
          }

          const finishedBatch = game.batch!.games.every((g) => g.hasEnded);
          if (finishedBatch) {
            game.batch!.end("all games finished");
          }

          checkShouldOpenExperiment(ctx);

          break;
        default:
          warn(`unkown game status: ${status}`);

          break;
      }
    });

    _.on("game", async (ctx, { game }) => {
      if (game.get("groupID")) {
        return;
      }

      // Create empty group for now, add players as assigned

      let groups: { id: string }[];
      try {
        groups = await ctx.addGroups([{ participantIDs: [] }]);
      } catch (err) {
        error(`failed to create game group: ${err}`);

        return;
      }

      if (groups.length < 1) {
        error(`failed to create game groups`);

        return;
      }

      const groupID = groups[0]!.id;

      game.set("groupID", groupID);
    });

    _.on("stage", "gameID", async (ctx, { stage }: { stage: Stage }) => {
      tryToStartGame(ctx, isGame(stage.currentGame));
    });

    type StageTimerID = { stage: Stage; timerID: string };
    _.after("stage", "timerID", (_, { stage, timerID }: StageTimerID) => {
      stageForStepID.set(timerID, stage);
    });

    function getNextStage(
      stage: Stage,
      game: Game
    ):
      | { stop: true; nextStage: undefined; nextRound: undefined }
      | { stop: false; nextStage: Stage; nextRound: Round } {
      if (game.hasEnded) {
        return { stop: true, nextStage: undefined, nextRound: undefined };
      }

      const currentIndex = game.stages.findIndex((s) => s.id === stage.id);
      const nextStage = game.stages[currentIndex + 1];

      if (!nextStage) {
        return { stop: true, nextStage: undefined, nextRound: undefined };
      }

      return { nextStage, nextRound: isRound(nextStage.round), stop: false };
    }

    _.on("player", "introDone", async (ctx, { player }: { player: Player }) => {
      if (!player.currentGame) {
        return;
      }

      const game = isGame(player.currentGame);
      const treatment = treatmentSchema.parse(game.get("treatment"));
      const playerCount = treatment["playerCount"] as number;
      const readyPlayers = game.players.filter((p) => p.get("introDone"));

      if (readyPlayers.length < playerCount) {
        trace("introDone: not enough players ready yet");

        return;
      }

      if (game.get("start")) {
        trace("introDone: game already started");
        return;
      }

      const players = selectRandom(readyPlayers, playerCount);
      const playersIDS = players.map((p) => p.id);
      for (const plyr of game.players) {
        if (!playersIDS.includes(plyr.id)) {
          plyr.set("gameID", null);
          await assignplayer(ctx, plyr, [game.id]);
        }
      }

      if (!game.get("start")) {
        trace("introDone: starting game");
        game.set("start", true);
      } else {
        trace("introDone: game already started");
      }
    });

    type BeforeGameStart = { game: Game; start: boolean };
    _.unique.before(
      "game",
      "start",
      async (_, { game, start }: BeforeGameStart) => {
        if (!start) {
          return;
        }

        for (const player of game.players) {
          await game.createPlayerGame(player);
        }
      }
    );

    type AfterGameStart = { game: Game; start: boolean };
    _.unique.after("game", "start", (_, { game, start }: AfterGameStart) => {
      if (!start) {
        return;
      }

      game.set("status", "running");
    });

    type BeforeRoundStart = { round: Round; start: boolean };
    _.unique.before(
      "round",
      "start",
      async (_, { round, start }: BeforeRoundStart) => {
        if (!start) {
          return;
        }

        const game = isGame(round.currentGame);

        for (const player of game.players) {
          await round.createPlayerRound(player);
        }
      }
    );

    type AfterRoundStart = {
      round: Round;
      start: boolean;
      attribute: Attribute;
    };
    _.unique.after(
      "round",
      "start",
      (ctx, { round, start }: AfterRoundStart) => {
        if (!start) return;

        const game = isGame(round.currentGame);
        const stageID = isString(game.get("stageID"));

        const stage = isStage(game.stages.find((s) => s.id === stageID));

        if (stage.get("start")) {
          return;
        }

        const participantIDs: string[] = [];
        const nodeIDs = [round.id];
        for (const player of game.players) {
          participantIDs.push(player.participantID!);
          nodeIDs.push(isString(player.get(`playerRoundID-${round.id}`)));
        }

        ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

        stage.set("start", true);
      }
    );

    type BeforeStageStart = { stage: Stage; start: boolean };
    _.unique.before(
      "stage",
      "start",
      async (_, { stage, start }: BeforeStageStart) => {
        if (!start) return;

        const game = isGame(stage.currentGame);

        for (const player of game.players) {
          await stage.createPlayerStage(player);
        }
      }
    );

    type AfterStageStart = {
      stage: Stage;
      start: boolean;
      attribute: Attribute;
    };
    _.unique.after(
      "stage",
      "start",
      (ctx, { stage, start }: AfterStageStart) => {
        if (!start) return;

        // NOTE: this is a hack to get the stage to start only once
        // TODO ensure that this is only called once.
        // Currently, it is can  be called multiple times wit the start == true
        // value, despite the unique.before hook above. This is because the
        // unique.before hook is not called when the attribute is set to true
        // but meanwhile the value is becomes true.
        if (stage.get("started")) {
          return;
        }
        stage.set("started", true);

        const game = isGame(stage.currentGame);

        const timerID = isString(stage.get("timerID"));

        const participantIDs: string[] = [];
        const nodeIDs = [stage.id, timerID];
        for (const player of game.players) {
          participantIDs.push(player.participantID!);
          nodeIDs.push(isString(player.get(`playerStageID-${stage.id}`)));
        }

        ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

        ctx.addTransitions([
          {
            from: State.Created,
            to: State.Running,
            nodeID: timerID,
            cause: "stage start",
          },
        ]);
      }
    );

    type PlayerStageSubmit = { playerStage: PlayerStage; submit: boolean };
    _.after(
      "playerStage",
      "submit",
      (ctx, { playerStage, submit }: PlayerStageSubmit) => {
        if (!submit) return;

        const players = playerStage.player!.currentGame!.players;
        if (players.length === 0) {
          warn("callbacks: no players onSubmit");
          return;
        }

        if (players.every((p) => p.stage!.get("submit"))) {
          ctx.addTransitions([
            {
              from: State.Running,
              to: State.Ended,
              nodeID: isString(playerStage.stage!.get("timerID")),
              cause: "players submitted",
            },
          ]);
          trace(`all player submitted, transitioning`);
        } else {
          trace(`not all player submitted`);
        }
      }
    );

    type AfterStageEnded = { stage: Stage; ended: boolean };
    _.unique.after(
      "stage",
      "ended",
      (ctx, { stage, ended }: AfterStageEnded) => {
        if (!ended) return;

        const game = isGame(stage.currentGame);
        const timerID = isString(stage.get("timerID"));
        const round = isRound(stage.round);

        const participantIDs: string[] = [];
        const nodeIDs: string[] = [stage.id, timerID!];
        for (const player of game.players) {
          participantIDs.push(player.participantID!);
          nodeIDs.push(isString(player.get(`playerStageID-${stage.id}`)));
        }

        ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

        const { stop, nextRound, nextStage } = getNextStage(stage, game);

        if (stop) {
          round.set("ended", true);

          return;
        }

        if (round.id !== nextRound.id) {
          round.set("ended", true);
        } else {
          game.set("stageID", nextStage.id);
          nextStage.set("start", true);
        }
      }
    );

    type AfterRoundEnded = { round: Round; ended: boolean };
    _.unique.after(
      "round",
      "ended",
      (ctx, { round, ended }: AfterRoundEnded) => {
        if (!ended) return;

        const game = isGame(round.currentGame);
        const stage = isStage(game.currentStage);

        const participantIDs: string[] = [];
        const nodeIDs: string[] = [round.id];
        for (const player of game.players) {
          participantIDs.push(player.participantID!);
          nodeIDs.push(isString(player.get(`playerRoundID-${round.id}`)));
        }

        ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

        const { stop, nextRound, nextStage } = getNextStage(stage, game);

        if (stop) {
          game.set("stageID", null);
          game.set("ended", true);

          return;
        }

        game.set("stageID", nextStage.id);
        nextRound.set("start", true);
      }
    );

    type AfterGameEnded = { game: Game; ended: boolean };
    _.unique.after("game", "ended", (_, { game, ended }: AfterGameEnded) => {
      if (!ended) return;

      game.end("ended", "end of game");
    });

    type TransitionAdd = { step: Step; transition: Transition };
    _.on(
      TajribaEvent.TransitionAdd,
      (_, { step, transition: { from, to } }: TransitionAdd) => {
        const hasStage = Boolean(stageForStepID.get(step.id));
        debug(`transition: ${from} => ${to} (has stage: ${hasStage})`);

        if (from === State.Running && to === State.Ended) {
          const stage = isStage(stageForStepID.get(step.id));

          if (!stage.get("ended")) {
            stage.set("ended", true);
          }
        }
      }
    );
  };
}
