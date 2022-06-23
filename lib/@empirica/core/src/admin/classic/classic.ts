import { State } from "@empirica/tajriba";
import { z } from "zod";
import { PlayerGame } from "../../player/classic";
import { Attribute } from "../../shared/attributes";
import { error, info, warn } from "../../utils/console";
import { deepEqual } from "../../utils/object";
import { StepPayload } from "../context";
import {
  EventContext,
  EvtCtxCallback,
  ListenersCollector,
  TajribaEvent,
} from "../events";
import { Participant } from "../participants";
import { Scope } from "../scopes";
import { Step, Transition } from "../transitions";
import { attrs } from "./helpers";
import {
  Batch,
  ClassicKinds,
  Context,
  Game,
  Player,
  PlayerRound,
  PlayerStage,
  Round,
  Stage,
} from "./models";

const batchConfigSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("simple"),
    config: z.object({
      count: z.number().int().positive(),
      treatments: z
        .object({
          factors: z.object({}).passthrough(),
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
            factors: z.object({}).passthrough(),
          }),
        })
        .array(),
    }),
  }),
]);

function pickRandom<T>(items: T[]): T {
  const random = Math.floor(Math.random() * items.length);
  return items[random] as T;
}

function unique<K extends keyof ClassicKinds>(
  kind: K,
  callback: EvtCtxCallback<Context, ClassicKinds>
) {
  return async (ctx: EventContext<Context, ClassicKinds>, props: any) => {
    const attr = props.attribute as Attribute;
    const scope = props[kind] as Scope<Context, ClassicKinds>;
    if (attr.id || scope.get(`ran-${attr.id}`)) {
      return;
    }

    await callback(ctx, props);
  };
}

export function Classic(_: ListenersCollector<Context, ClassicKinds>) {
  // _.on("start", function (_) {});

  const online = new Map<string, Participant>();
  const playersForParticipant = new Map<string, Player>();
  const playersByGame = new Map<string, Player[]>();
  const playersByID = new Map<string, Player>();
  const stagesByGame = new Map<string, Stage[]>();
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

      let availableGames = batch.unstartedGames;

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
  }

  _.on(TajribaEvent.ParticipantConnect, function (ctx, { participant }) {
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

  _.on(TajribaEvent.ParticipantConnect, function (_, { participant }) {
    online.delete(participant.id);
  });

  _.on("player", function (ctx, { player }: { player: Player }) {
    const participantID = player.get("participantID") as string;
    if (!participantID) {
      warn(`player without participant id: ${player.id}`);
    }
    playersByID.set(player.id, player);

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

  type PlayerGameID = { player: Player; gameID: string };
  _.on("player", "gameID", function (_, { player, gameID }: PlayerGameID) {
    if (!player.participantID) {
      error(`game player without participant id: ${player.id}`);
      return;
    }

    let players = playersByGame.get(gameID);
    if (!players) {
      players = [];
      playersByGame.set(gameID, players);
    }

    players.push(player);
  });

  _.on("batch", function (_, { batch }: { batch: Batch }) {
    batches.push(batch);

    const res = batchConfigSchema.safeParse(batch.get("config"));
    if (!res.success) {
      warn("batch created without a config");

      return;
    }

    const config = res.data;
    info("new batch", config);

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
  _.on(
    "batch",
    "status",
    unique("batch", function (ctx, { batch, status }: BatchStatus) {
      switch (status) {
        case "running": {
          for (const [_, player] of playersForParticipant) {
            const idRes = z.string().safeParse(player.get("participantID"));
            if (idRes.success && online.has(idRes.data)) {
              assignplayer(player);
            }
          }

          const shouldOpenExperiment = batches.some((b) => b.available);
          ctx.globals.set("experimentOpen", shouldOpenExperiment);

          break;
        }

        case "ended":
          console.debug("callbacks: batch ended");
          for (const game of batch.games) {
            const status = game.get("status") as string;
            if (["failed", "ended", "terminated"].includes(status)) {
              game.end("batch ended");
            }
          }

          break;

        default:
          warn(`unkown batch status: ${status}`);

          break;
      }
    })
  );

  type GameStatus = { game: Game; status: string };
  _.on(
    "game",
    "status",
    unique("game", function (ctx, { game, status }: GameStatus) {
      switch (status) {
        case "running": {
          game.set("start", true);

          const shouldOpenExperiment = batches.some((b) => b.available);
          ctx.globals.set("experimentOpen", shouldOpenExperiment);

          break;
        }

        case "ended":
          if (!game.batch) {
            error(`batch is missing on ending game: ${game.id}`);

            return;
          }

          const finishedBatch = !game.batch.games.some((g) => !g.hasEnded);
          if (finishedBatch) {
            game.batch.end("all games finished");
          }

          break;
        default:
          warn(`unkown batch status: ${status}`);

          break;
      }
    })
  );

  _.on("game", function (ctx, { game }) {
    if (game.get("groupID")) {
      return;
    }

    // Create empty group for now, add players as assigned
    ctx.addGroups([{ participantIDs: [] }]);
  });

  _.on("stage", async function (ctx, { stage }: { stage: Stage }) {
    if (!stage.currentGame) {
      error(`stage without game: ${stage.id}`);

      return;
    }

    let stages = stagesByGame.get(stage.currentGame.id);
    if (!stages) {
      stages = [];
      stagesByGame.set(stage.currentGame.id, stages);
    }

    if (typeof stage.get("index") !== "number") {
      error(`stage without index: ${stage.id}`);

      return;
    }

    const res = z.number().int().gte(5).safeParse(stage.get("duration"));
    if (!res.success) {
      error(`stage start without duration: ${stage.id}: ${res.error}`);

      return;
    }

    const duration = res.data;

    const timerID = stage.get("timerID");
    if (!timerID || typeof timerID !== "string") {
      let steps: StepPayload[];
      try {
        steps = await ctx.addSteps([{ duration }]);
      } catch (err) {
        error(`failed to create steps: ${err}`);

        return;
      }

      if (steps.length < 1) {
        error(`failed to create steps`);

        return;
      }

      const stepID = steps[0]!.id;

      stage.set("timerID", stepID);

      return;
    } else {
      stageForStepID.set(timerID, stage);
    }

    stages.push(stage);
    stages.sort(
      (a, b) => (a.get("index") as number) - (b.get("index") as number)
    );
  });

  type StageTimerID = { stage: Stage; timerID: string };
  _.after("stage", "timerID", function (_, { stage, timerID }: StageTimerID) {
    stageForStepID.set(timerID, stage);
  });

  function getNextStage(stage: Stage, game: Game) {
    const stages = stagesByGame.get(game.id);
    if (!stages) {
      error(`running game without stages: ${game.id}`);

      return { stop: true };
    }

    const currentIndex = stages.findIndex((s) => s.id === stage.id);
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      game.set("stageID", null);
      // game.end("stages finished");

      return { stop: true };
    }

    const nextRound = nextStage.round;
    if (!nextRound) {
      error(`next stage without round`);

      return { stop: true };
    }

    return { nextStage, nextRound };
  }

  _.on("playerGame", function (_, { playerGame }: { playerGame: PlayerGame }) {
    const playerID = playerGame.get("playerID") as string;
    if (!playerID) {
      error(`playerGame without player ID: ${playerGame.id}`);

      return;
    }

    const gameID = playerGame.get("gameID") as string;
    if (!gameID) {
      error(`playerGame without game ID: ${playerGame.id}`);

      return;
    }

    const player = playersByID.get(playerID);
    if (!player) {
      error(`playerGame without player: ${playerGame.id}`);

      return;
    }

    const key = `playerGameID-${gameID}`;
    if (player.get(key)) {
      player.set(key, playerGame.id);
    }
  });

  _.on(
    "playerRound",
    function (_, { playerRound }: { playerRound: PlayerRound }) {
      const playerID = playerRound.get("playerID") as string;
      if (!playerID) {
        error(`playerRound without player ID: ${playerRound.id}`);

        return;
      }

      const roundID = playerRound.get("roundID") as string;
      if (!roundID) {
        error(`playerRound without round ID: ${playerRound.id}`);

        return;
      }

      const player = playersByID.get(playerID);
      if (!player) {
        error(`playerRound without player: ${playerRound.id}`);

        return;
      }

      const key = `playerRoundID-${roundID}`;
      if (player.get(key)) {
        player.set(key, playerRound.id);
      }
    }
  );

  _.on(
    "playerStage",
    function (_, { playerStage }: { playerStage: PlayerStage }) {
      const playerID = playerStage.get("playerID") as string;
      if (!playerID) {
        error(`playerStage without player ID: ${playerStage.id}`);

        return;
      }

      const stageID = playerStage.get("stageID") as string;
      if (!stageID) {
        error(`playerStage without round ID: ${playerStage.id}`);

        return;
      }

      const player = playersByID.get(playerID);
      if (!player) {
        error(`playerStage without player: ${playerStage.id}`);

        return;
      }

      const key = `playerStageID-${stageID}`;
      if (player.get(key)) {
        player.set(key, playerStage.id);
      }
    }
  );

  type BeforeGameStart = { game: Game; start: boolean };
  _.before(
    "game",
    "start",
    unique("game", function (ctx, { game, start }: BeforeGameStart) {
      if (!start) {
        return;
      }

      const batchID = game.get("batchID") as string;
      if (!batchID) {
        error(`game without batch ID: ${game.id}`);

        return;
      }

      const players = playersByGame.get(game.id) || [];

      for (const player of players) {
        ctx.addScopes([
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
      }
    })
  );

  type AfterGameStart = { game: Game; start: boolean };
  _.after(
    "game",
    "start",
    unique("game", function (ctx, { game, start }: AfterGameStart) {
      if (!start) {
        return;
      }

      const groupID = game.get("groupID") as string;
      if (!groupID) {
        error(`start game missing group ID: ${game.id}`);

        return;
      }

      const players = playersByGame.get(game.id) || [];

      const participantIDs: string[] = [];
      const nodeIDs = [game.id, groupID];
      for (const player of players) {
        nodeIDs.push(player.id);
        participantIDs.push(player.participantID!);
        const playerGameID = player.get(`playerGameID-${game.id}`) as string;
        if (playerGameID) {
          nodeIDs.push(playerGameID);
        } else {
          error(`game player without playerGameID: ${game.id}, ${player.id}`);
        }
      }

      ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

      const stages = stagesByGame.get(game.id);
      if (!stages || stages.length === 0) {
        error(`running game without stages: ${game.id}`);

        return;
      }

      // Checked length > 0 above
      const stage = stages[0]!;

      const round = stage.round;
      if (!round) {
        error(`first stage without round: ${game.id}, ${stage.id}`);

        return;
      }

      game.set("stageID", stage.id);

      round.set("start", true);
    })
  );

  type BeforeRoundStart = { round: Round; start: boolean };
  _.before(
    "round",
    "start",
    unique("round", function (ctx, { round, start }: BeforeRoundStart) {
      if (!start) {
        return;
      }

      const gameID = round.get("gameID") as string;
      if (!gameID) {
        error(`round start without game: ${round.id}`);

        return;
      }

      const batchID = round.get("batchID") as string;
      if (!batchID) {
        error(`round without batch ID: ${round.id}`);

        return;
      }

      const players = playersByGame.get(gameID) || [];

      for (const player of players) {
        ctx.addScopes([
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
      }
    })
  );

  type AfterRoundStart = { round: Round; start: boolean };
  _.after(
    "round",
    "start",
    unique("round", function (ctx, { round, start }: AfterRoundStart) {
      if (!start) {
        return;
      }

      const game = round.currentGame;
      if (!game) {
        error(`round start without game: ${round.id}`);

        return;
      }

      const gameID = game.id;

      const stageID = game.get("stageID") as string;
      if (!stageID) {
        error(`round start without stageID: ${round.id}`);

        return;
      }

      const stages = stagesByGame.get(gameID) || [];
      const stage = stages.find((s) => s.id === stageID);
      if (!stage) {
        error(`round start without stage: ${round.id}`);

        return;
      }

      const players = playersByGame.get(gameID) || [];

      const participantIDs: string[] = [];
      const nodeIDs = [round.id];
      for (const player of players) {
        participantIDs.push(player.participantID!);
        const playerRoundID = player.get(`playerGameID-${round.id}`) as string;
        if (playerRoundID) {
          nodeIDs.push(playerRoundID);
        } else {
          error(
            `round player without playerRoundID: ${round.id}, ${player.id}`
          );
        }
      }

      ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

      stage.set("start", true);
    })
  );

  type BeforeStageStart = { stage: Stage; start: boolean };
  _.before(
    "stage",
    "start",
    unique("stage", async function (ctx, { stage, start }: BeforeStageStart) {
      if (!start) {
        return;
      }

      const roundID = stage.get("roundID") as string;
      if (!roundID) {
        error(`stage start without round ID: ${stage.id}`);

        return;
      }

      const gameID = stage.get("gameID") as string;
      if (!gameID) {
        error(`stage start without game ID: ${stage.id}`);

        return;
      }

      const batchID = stage.get("batchID") as string;
      if (!batchID) {
        error(`stage without batch ID: ${stage.id}`);

        return;
      }

      const players = playersByGame.get(gameID) || [];

      for (const player of players) {
        ctx.addScopes([
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
      }
    })
  );

  type AfterStageStart = { stage: Stage; start: boolean };
  _.after(
    "stage",
    "start",
    unique("stage", function (ctx, { stage, start }: AfterStageStart) {
      if (!start) {
        return;
      }

      const game = stage.currentGame;
      if (!game) {
        error(`stage start without game: ${stage.id}`);

        return;
      }

      const gameID = game.id;

      const timerID = stage.get("timerID") as string;
      if (!timerID) {
        error(`stage start without timerID: ${stage.id}`);

        return;
      }

      const players = playersByGame.get(gameID) || [];

      const participantIDs: string[] = [];
      const nodeIDs = [stage.id, timerID];
      for (const player of players) {
        participantIDs.push(player.participantID!);
        const playerStageID = player.get(`playerGameID-${stage.id}`) as string;
        if (playerStageID) {
          nodeIDs.push(playerStageID);
        } else {
          error(
            `stage player without playerStageID: ${stage.id}, ${player.id}`
          );
        }
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
    })
  );

  type AfterStageEnded = { stage: Stage; ended: boolean };
  _.after(
    "stage",
    "ended",
    unique("stage", function (ctx, { stage, ended }: AfterStageEnded) {
      if (!ended) {
        return;
      }

      const game = stage.currentGame;
      if (!game) {
        error(`stage ended without game: ${stage.id}`);

        return;
      }

      const timerID = stage.get("timerID") as string;
      if (!timerID) {
        error(`stage ended without timer: ${stage.id}`);

        return;
      }

      const round = stage.round;
      if (!round) {
        error(`stage ended without round: ${stage.id}`);

        return;
      }

      const players = playersByGame.get(game.id) || [];

      if (game.hasEnded) {
        // unlink everything
        return;
      }

      const participantIDs: string[] = [];
      const nodeIDs: string[] = [stage.id, timerID!];
      for (const player of players) {
        participantIDs.push(player.participantID!);
        nodeIDs.push(player.get(`playerStageID-${stage.id}`) as string);
      }

      ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

      const { stop, nextRound, nextStage } = getNextStage(stage, game);

      if (stop) {
        return;
      }

      if (round.id !== nextRound!.id) {
        round.set("ended", true);

        return;
      }

      game.set("stageID", nextStage!.id);
      nextStage!.set("start", true);
    })
  );

  type AfterRoundEnded = { round: Round; ended: boolean };
  _.after(
    "round",
    "ended",
    unique("round", (ctx, { round, ended }: AfterRoundEnded) => {
      if (!ended) {
        return;
      }

      const game = round.currentGame;
      if (!game) {
        error(`round ended without game: ${round.id}`);

        return;
      }

      const stage = game.currentStage;
      if (!stage) {
        error(`round ended without stage: ${round.id}`);

        return;
      }

      const currentRound = game.currentRound;
      if (!currentRound || round.id !== currentRound.id) {
        error(`round ended without being current: ${round.id}`);

        return;
      }

      const players = playersByGame.get(game.id) || [];

      if (game.hasEnded) {
        // unlink everything
        return;
      }

      const participantIDs: string[] = [];
      const nodeIDs: string[] = [round.id];
      for (const player of players) {
        participantIDs.push(player.participantID!);
        nodeIDs.push(player.get(`playerRoundID-${round.id}`) as string);
      }

      ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

      const { stop, nextRound } = getNextStage(stage, game);

      if (stop) {
        return;
      }

      nextRound!.set("start", true);
    })
  );

  type AfterGameEnded = { game: Game; ended: boolean };
  _.after(
    "game",
    "ended",
    unique("game", function (ctx, { game, ended }: AfterGameEnded) {
      if (!ended) {
        return;
      }

      const groupID = game.get("groupID") as string;
      if (!groupID) {
        error(`start game missing group ID: ${game.id}`);

        return;
      }

      const players = playersByGame.get(game.id) || [];

      const participantIDs: string[] = [];
      const nodeIDs = [game.id, groupID];
      for (const player of players) {
        participantIDs.push(player.participantID!);
        const playerGameID = player.get(`playerGameID-${game.id}`) as string;
        if (playerGameID) {
          nodeIDs.push(playerGameID);
        } else {
          error(`game player without playerGameID: ${game.id}, ${player.id}`);
        }
      }

      ctx.addLinks([{ link: false, participantIDs, nodeIDs }]);

      // Unlink Game
      // Check if batch ended

      if (!game.batch) {
        error(`game ended without batch: ${game.id}`);

        return;
      }

      game.end("end of game");
    })
  );

  type TransitionAdd = { step: Step; transition: Transition };
  _.on(
    TajribaEvent.TransitionAdd,
    function (_, { step, transition }: TransitionAdd) {
      const stage = stageForStepID.get(step.id);
      info(step, transition, stage);
      if (transition.from === State.Running && transition.to === State.Ended) {
        if (!stage) {
          error(`step ending without stage: ${step.id}`);

          return;
        }

        if (!stage.get("ended")) {
          stage.set("ended", true);
        }
      }
    }
  );
}
