import { State } from "@empirica/tajriba";
import { z } from "zod";
import { debug, error, info, trace, warn } from "../../utils/console";
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
  Game,
  Player,
  PlayerStage,
  Round,
  Stage,
} from "./models";

const treatmentSchema = z.record(z.string().min(1), z.any());

const batchConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("simple"),
    config: z.object({
      count: z.number().int().positive(),
      treatments: z
        .object({
          factors: treatmentSchema,
        })
        .array(),
    }),
  }),
  z.object({
    kind: z.literal("complete"),
    config: z.object({
      treatments: z
        .object({
          count: z.number().int().positive(),
          treatment: z.object({
            factors: treatmentSchema,
          }),
        })
        .array(),
    }),
  }),
]);

const isBatch = z.instanceof(Batch).parse;
const isGame = z.instanceof(Game).parse;
const isRound = z.instanceof(Round).parse;
const isStage = z.instanceof(Stage).parse;

const isString = z.string().parse;

export function Classic(_: ListenersCollector<Context, ClassicKinds>) {
  const online = new Map<string, Participant>();
  const playersForParticipant = new Map<string, Player>();
  const stageForStepID = new Map<string, Stage>();
  const batches: Batch[] = [];

  function assignplayer(player: Player) {
    if (player.get("gameID")) {
      return;
    }

    for (const batch of batches) {
      if (!batch.isRunning) {
        continue;
      }

      let availableGames = [];

      for (const game of batch.games) {
        if (game.hasNotStarted) {
          availableGames.push(game);
        }
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

      const treatment = game.get("treatment");
      if (!treatment) {
        warn(`game without treatment: ${game.id}`);

        return;
      }

      player.set("gameID", game.id);
      player.set("treatment", treatment);

      return;
    }

    player.set("ended", "no more games");
  }

  function checkShouldOpenExperiment(ctx: EventContext<Context, ClassicKinds>) {
    let shouldOpenExperiment = false;

    LOOP: for (const batch of batches) {
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
      nodeIDs.push(isString(player.get(`playerGameID-${game.id}`)));
    }

    ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

    const stage = isStage(game.stages[0]);
    const round = isRound(stage.round);

    game.set("stageID", stage.id);

    round.set("start", true);
  }

  _.on(TajribaEvent.ParticipantConnect, (ctx, { participant }) => {
    online.set(participant.id, participant);

    const player = playersForParticipant.get(participant.id);

    if (!player) {
      ctx.addScopes([
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
      assignplayer(player);
    }
  });

  _.on(TajribaEvent.ParticipantConnect, (_, { participant }) => {
    online.delete(participant.id);
  });

  _.on("player", (ctx, { player }: { player: Player }) => {
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
      assignplayer(player);
    }
  });

  _.on("batch", (_, { batch }: { batch: Batch }) => {
    batches.push(batch);

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
  _.unique.on("batch", "status", (ctx, { batch, status }: BatchStatus) => {
    switch (status) {
      case "running": {
        for (const [_, player] of playersForParticipant) {
          if (player.participantID) {
            assignplayer(player);
          }
        }

        checkShouldOpenExperiment(ctx);
        break;
      }
      case "ended":
        console.debug("callbacks: batch ended");
        for (const game of batch.games) {
          const status = isString(game.get("status"));
          if (["failed", "ended", "terminated"].includes(status)) {
            game.end("batch ended");
          }
        }

        break;

      default:
        warn(`unkown batch status: ${status}`);

        break;
    }
  });

  type GameStatus = { game: Game; status: string };
  _.unique.on("game", "status", (ctx, { game, status }: GameStatus) => {
    console.log("GAME STATUS", status);

    switch (status) {
      case "running": {
        tryToStartGame(ctx, game);
        checkShouldOpenExperiment(ctx);

        break;
      }

      case "ended":
        const batch = isBatch(game.batch);

        const finishedBatch = !batch.games.some((g) => !g.hasEnded);
        if (finishedBatch) {
          batch.end("all games finished");
        }

        break;
      default:
        warn(`unkown batch status: ${status}`);

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
    const currentIndex = game.stages.findIndex((s) => s.id === stage.id);
    const nextStage = game.stages[currentIndex + 1];

    if (!nextStage) {
      return { stop: true, nextStage: undefined, nextRound: undefined };
    }

    return { nextStage, nextRound: isRound(nextStage.round), stop: false };
  }

  _.on("player", "introDone", (_, { player }: { player: Player }) => {
    const game = isGame(player.currentGame);
    const treatment = treatmentSchema.parse(game.get("treatment"));
    const playerCount = treatment["playerCount"] as number;
    const readyPlayers = game.players.filter((p) => p.get("introDone"));

    if (readyPlayers.length < playerCount) {
      trace("introDone: not enough players ready yet");

      return;
    }

    const players = selectRandom(readyPlayers, playerCount);
    for (const plyr of game.players) {
      if (!players.some((p) => p.id === plyr.id)) {
        player.set("gameID", null);
        assignplayer(player);
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
    async (ctx, { game, start }: BeforeGameStart) => {
      if (!start) {
        return;
      }
      trace("game start: HERE");

      const batchID = isString(game.get("batchID"));

      trace(
        "game start: players: ",
        game.players.map((p) => p.id)
      );

      for (const player of game.players) {
        const playerGames = await ctx.addScopes([
          {
            kind: "playerGame",
            attributes: attrs([
              {
                key: "batchID",
                value: batchID,
                immutable: true,
              },
              {
                key: "gameID",
                value: game.id,
                immutable: true,
              },
              {
                key: "playerID",
                value: player.id,
                immutable: true,
              },
            ]),
          },
        ]);

        if (playerGames.length < 1) {
          error(`failed to create playerGame`);

          return;
        }

        const key = `playerGameID-${game.id}`;
        if (!player.get(key)) {
          player.set(key, playerGames[0]!.id);
        }
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
    async (ctx, { round, start }: BeforeRoundStart) => {
      if (!start) {
        return;
      }

      const gameID = isString(round.get("gameID"));
      const batchID = isString(round.get("batchID"));
      const game = isGame(round.currentGame);

      for (const player of game.players) {
        const playerRounds = await ctx.addScopes([
          {
            kind: "playerRound",
            attributes: attrs([
              {
                key: "batchID",
                value: batchID,
                immutable: true,
              },
              {
                key: "gameID",
                value: gameID,
                immutable: true,
              },
              {
                key: "roundID",
                value: round.id,
                immutable: true,
              },
              {
                key: "playerID",
                value: player.id,
                immutable: true,
              },
            ]),
          },
        ]);

        if (playerRounds.length < 1) {
          error(`failed to create playerRound`);
          return;
        }

        const key = `playerRoundID-${round.id}`;
        if (!player.get(key)) {
          player.set(key, playerRounds[0]!.id);
        }
      }
    }
  );

  type AfterRoundStart = { round: Round; start: boolean };
  _.unique.after("round", "start", (ctx, { round, start }: AfterRoundStart) => {
    if (!start) return;

    const game = isGame(round.currentGame);
    const stageID = isString(game.get("stageID"));

    const stage = isStage(game.stages.find((s) => s.id === stageID));

    const participantIDs: string[] = [];
    const nodeIDs = [round.id];
    for (const player of game.players) {
      participantIDs.push(player.participantID!);
      nodeIDs.push(isString(player.get(`playerRoundID-${round.id}`)));
    }

    ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

    stage.set("start", true);
  });

  type BeforeStageStart = { stage: Stage; start: boolean };
  _.unique.before(
    "stage",
    "start",
    async (ctx, { stage, start }: BeforeStageStart) => {
      if (!start) return;

      const roundID = isString(stage.get("roundID"));
      const gameID = isString(stage.get("gameID"));
      const batchID = isString(stage.get("batchID"));
      const game = isGame(stage.currentGame);

      for (const player of game.players) {
        const playerStages = await ctx.addScopes([
          {
            kind: "playerStage",
            attributes: attrs([
              {
                key: "batchID",
                value: batchID,
                immutable: true,
              },
              {
                key: "gameID",
                value: gameID,
                immutable: true,
              },
              {
                key: "roundID",
                value: roundID,
                immutable: true,
              },
              {
                key: "stageID",
                value: stage.id,
                immutable: true,
              },
              {
                key: "playerID",
                value: player.id,
                immutable: true,
              },
            ]),
          },
        ]);

        if (playerStages.length < 1) {
          error(`failed to create playerStage`);

          return;
        }

        const key = `playerStageID-${stage.id}`;
        if (!player.get(key)) {
          player.set(key, playerStages[0]!.id);
        }
      }
    }
  );

  type AfterStageStart = { stage: Stage; start: boolean };
  _.unique.after("stage", "start", (ctx, { stage, start }: AfterStageStart) => {
    if (!start) return;

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
  });

  type PlayerStageSubmit = { playerStage: PlayerStage; submit: boolean };
  _.after(
    "playerStage",
    "submit",
    (ctx, { playerStage, submit }: PlayerStageSubmit) => {
      if (!submit) return;

      const players = playerStage.player!.currentGame!.players;
      if (players.length === 0) {
        console.warn("callbacks: no players onSubmit");
        return;
      }

      info(
        "SUBMIT",
        players.map((p) => [p.id, Boolean(p.stage!), p.stage!.get("submit")])
      );

      if (players.every((p) => p.stage!.get("submit"))) {
        ctx.addTransitions([
          {
            from: State.Running,
            to: State.Ended,
            nodeID: isString(playerStage.stage!.get("timerID")),
            cause: "players submitted",
          },
        ]);
        debug(`all player submitted, transitioning`);
      } else {
        debug(`not all player submitted`);
      }
    }
  );

  type AfterStageEnded = { stage: Stage; ended: boolean };
  _.unique.after("stage", "ended", (ctx, { stage, ended }: AfterStageEnded) => {
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
  });

  type AfterRoundEnded = { round: Round; ended: boolean };
  _.unique.after("round", "ended", (ctx, { round, ended }: AfterRoundEnded) => {
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
  });

  type AfterGameEnded = { game: Game; ended: boolean };
  _.unique.after("game", "ended", (_, { game, ended }: AfterGameEnded) => {
    if (!ended) return;

    // const groupID = isString(game.get("groupID"));

    // const participantIDs: string[] = [];
    // const nodeIDs = [game.id, groupID];
    // for (const player of game.players) {
    //   participantIDs.push(player.participantID!);
    //   nodeIDs.push(isString(player.get(`playerGameID-${game.id}`)));
    // }

    // ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

    game.end("end of game");
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
}
