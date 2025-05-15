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
  Game,
  Player,
  PlayerStage,
  Round,
  Stage,
  evt,
} from "./models";
import { batchConfigSchema, factorsSchema } from "./schemas";

// const isBatch = z.instanceof(Batch).parse;
const isGame = z.instanceof(Game).parse;
const isRound = z.instanceof(Round).parse;
const isStage = z.instanceof(Stage).parse;
const isString = z.string().parse;

export type ClassicConfig = {
  /**
   * Disables automatic assignment of players on the connection of a new player.
   * It is up to the developer to call `game.assignPlayer` when they want to
   * assign a player to a game.
   *
   * @type {boolean}
   */
  disableAssignment?: boolean;

  /**
   * Disable the introDone check (when the players are done with intro steps),
   * which normally will check if enough players are ready (done with intro
   * steps) to start a game. This means that the game will not start on its own
   * after intro steps. It is up to the developer to start the game manually
   * with `game.start()`.
   *
   * This also disables playerCount checks and overflow from one game to the
   * next available game with the same treatment.
   *
   * @type {boolean}
   */
  disableIntroCheck?: boolean;

  /**
   * Disable game creation on new batch.
   *
   * @type {boolean}
   */
  disableGameCreation?: boolean;

  /**
   * By default if all existing games are complete, the batch ends.
   * This option disables this pattern so that we can leave a batch open
   * indefinitely.
   * It enables to spawn new games for people who arrive later, even if all
   * previous games had already finished.
   *
   * @type {boolean}
   */
  disableBatchAutoend?: boolean;

  /**
   * If true, players will be assigned to games that still have open slots
   * rather than pure random assignment.
   *
   * @type {boolean}
   */
  preferUnderassignedGames?: boolean;

  /**
   * If a game is full, don't assign more players to it.
   * If there is a subsequent batch that still has open slots, it will still try
   * to assign players to those games.
   * If `preferUnderassignedGames` is also set, `neverOverbookGames` will take
   * precedence.
   *
   * @type {boolean}
   */
  neverOverbookGames?: boolean;
};

export function Classic({
  disableAssignment,
  disableIntroCheck,
  disableGameCreation,
  disableBatchAutoend = false,
  preferUnderassignedGames,
  neverOverbookGames,
}: ClassicConfig = {}) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    const online = new Map<string, Participant>();
    const playersForParticipant = new Map<string, Player>();
    const stageForStepID = new Map<string, Stage>();

    /**
     * Assign a Player to an available Game following the rules dictated by
     * `preferUnderassignedGames` and `neverOverbookGames`.
     *
     * Algorithm overview:
     * 1. Abort early when assignment has been disabled (`disableAssignment`) or
     *    the player is already assigned (their `gameID` attribute holds a
     *    non-null string).
     * 2. Iterate over *running* batches **in creation order**.  We want to keep
     *    participants in the earliest batch that can still accommodate them so
     *    everything moves through the pipeline together.  The only exception
     *    is the `neverOverbookGames` flag: if all games in the current batch
     *    are full we *may* spill over to the next batch rather than over-book.
     * 3. For every batch construct two lists:
     *      • `candidateGames`   – games that can *potentially* host the player
     *        (not started/ended, not skipped, matching treatment when
     *        required).
     *      • `openSlotGames`    – subset of `candidateGames` whose current
     *        player count is strictly below the `playerCount` factor (when the
     *        factor is defined).  If the factor is missing or invalid we
     *        conservatively treat the game as having room.
     * 4. Decision logic inside a batch:
     *      a) `preferUnderassignedGames`\|\|`neverOverbookGames` true
     *          – If `openSlotGames` is non-empty ⇒ assign there.
     *          – Else if `neverOverbookGames` ⇒ *skip to the next batch* (we
     *            refuse to over-book).
     *          – Else (`preferUnderassignedGames` only) ⇒ over-book within
     *            `candidateGames`.
     *      b) Neither flag true ⇒ assign to any `candidateGames` immediately.
     * 5. If every batch has been inspected and we could not place the player:
     *      – When `neverOverbookGames` is true ⇒ always mark the participant
     *        as `ended = "no more games"` so the front-end can transition to
     *        the exit page.
     *      – Otherwise we only mark `ended` when the player *previously* had a
     *        `gameID` attribute (either an active one or `null`).  This leaves
     *        brand-new visitors waiting in the lobby so they can join future
     *        batches that may be created later.
     *
     * About the `gameID` attribute:
     *      undefined – attribute has never been created ⇒ brand-new player.
     *      null      – player had been assigned but was un-assigned later.
     *      string    – player is currently assigned to that game.
     */
    async function assignplayer(
      ctx: EventContext<Context, ClassicKinds>,
      player: Player,
      skipGameIDs?: string[]
    ) {
      // Global opt-out hook: the developer disabled automatic assignment.
      if (disableAssignment) {
        return;
      }

      // Stop early for players *currently* assigned to a game.  Note that
      // `player.get("gameID")` returns `null` for *un-assigned* players who
      // previously had been in a game – those should continue through the
      // rest of the algorithm.
      if (player.get("gameID")) {
        return;
      }

      // ------------------------------------------------------------------
      //  Main search loop: inspect running batches one after the other.
      // ------------------------------------------------------------------
      for (const batch of evt(ctx).batches) {
        if (!batch.isRunning) {
          continue;
        }

        // --------------------------------------------------------------
        //  Gather *candidate* games inside this batch.
        // --------------------------------------------------------------
        let candidateGames: Game[] = [];
        for (const game of batch.games) {
          if (
            game.isStarting ||
            game.hasStarted ||
            game.hasEnded ||
            (skipGameIDs && skipGameIDs.includes(game.id))
          ) {
            continue;
          }

          candidateGames.push(game);
        }

        if (candidateGames.length === 0) {
          continue;
        }

        // If the player already has a treatment we only consider matching games
        if (player.get("treatment")) {
          candidateGames = candidateGames.filter((g) =>
            deepEqual(g.get("treatment"), player.get("treatment"))
          );
        }

        if (candidateGames.length === 0) {
          continue;
        }

        // Build the open-slot subset (games that are not yet full).
        const openSlotGames: Game[] = candidateGames.filter((g) => {
          const result = factorsSchema.safeParse(g.get("treatment"));
          if (!result.success) {
            // If schema fails we conservatively assume there is room
            return true;
          }

          const pc = result.data["playerCount"] as number | undefined;
          if (typeof pc !== "number") {
            return true;
          }

          return g.players.length < pc;
        });

        // ----- Decision logic within this batch -----
        if (preferUnderassignedGames || neverOverbookGames) {
          if (openSlotGames.length > 0) {
            const game = pickRandom(openSlotGames);
            await game.assignPlayer(player);
            return;
          }

          if (neverOverbookGames) {
            // Cannot overbook in this batch, try next batch
            continue;
          }

          // preferUnderassignedGames fallback: allow overbooking within THIS batch
          const game = pickRandom(candidateGames);
          await game.assignPlayer(player);
          return;
        } else {
          // Neither flag set – pick directly from this batch
          const game = pickRandom(candidateGames);
          await game.assignPlayer(player);
          return;
        }
      }

      // --------------------------------------------------------------
      //  No games available across *all* batches – decide what to do.
      // --------------------------------------------------------------
      if (neverOverbookGames) {
        player.set("ended", "no more games");
      } else if (player.get("gameID") !== undefined) {
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
          if (!game.hasStarted && !game.hasEnded) {
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

      if (game.rounds.length === 0) {
        return;
      }

      const round = isRound(game.rounds[0]);

      if (round.stages.length === 0) {
        return;
      }

      const stage = isStage(round.stages[0]);

      const groupID = isString(game.get("groupID"));

      const players = game.players.filter((p) => !p.get("ended"));

      const participantIDs: string[] = [];
      const nodeIDs = [game.id, groupID];
      for (const player of players) {
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

      game.set("stageID", stage.id);

      round.set("start", true);
    }

    _.on(TajribaEvent.ParticipantConnect, async (ctx, { participant }) => {
      online.set(participant.id, participant);

      const player = playersForParticipant.get(participant.id);

      if (!player) {
        await ctx.addScopes([
          {
            attributes: attrs([
              {
                key: "participantID",
                value: participant.id,
                immutable: true,
              },
              {
                key: "participantIdentifier",
                value: participant.identifier,
                immutable: true,
              },
            ]),
            kind: "player",
          },
        ]);
      } else {
        await assignplayer(ctx, player);
      }
    });

    _.on(TajribaEvent.ParticipantDisconnect, (_, { participant }) => {
      online.delete(participant.id);
    });

    _.on("player", async (ctx, { player }: { player: Player }) => {
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
      if (disableGameCreation || batch.get("initialized")) {
        return;
      }

      batch.set("initialized", true);

      const config = batchConfigSchema.parse(batch.get("config"));

      switch (config.kind) {
        case "simple":
          for (let i = 0; i < config.config.count; i++) {
            const treatment = pickRandom(config.config.treatments);
            batch.addGame([
              {
                key: "treatment",
                value: treatment.factors,
                immutable: true,
              },
              {
                key: "treatmentName",
                value: treatment.name || "",
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
                {
                  key: "treatmentName",
                  value: t.treatment.name || "",
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
          case "created":
            // noop

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
        case "failed":
        case "terminated":
          for (const player of game.players) {
            player.set("ended", `game ${status}`);
          }

          const finishedBatch =
            !disableBatchAutoend && game.batch!.games.every((g) => g.hasEnded);

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
      if (!stage.currentGame?.isRunning) {
        return;
      }

      tryToStartGame(ctx, stage.currentGame);
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
      // Stop if we're at the end of the game
      if (game.hasEnded) {
        return { stop: true, nextStage: undefined, nextRound: undefined };
      }

      // Get the next stage in round
      const currentRound = isRound(stage.round);
      let nextRound: Round | undefined = currentRound;
      const roundStages = currentRound.stages;
      let nextStage: Stage | undefined =
        roundStages[(stage.get("index") as number) + 1];

      // If no more stages in round, get next round
      if (!nextStage) {
        const gameRounds = game.rounds;
        nextRound = gameRounds[(currentRound.get("index") as number) + 1];

        // If no more rounds in game, stop
        if (!nextRound) {
          return { stop: true, nextStage: undefined, nextRound: undefined };
        }

        // Get first stage in next round
        nextStage = nextRound.stages[0];

        // If next round is empty for whatever reason, stop
        if (!nextStage) {
          return { stop: true, nextStage: undefined, nextRound: undefined };
        }
      }

      return { nextStage, nextRound, stop: false };
    }

    async function introDoneCheck(
      ctx: EventContext<Context, ClassicKinds>,
      player: Player
    ) {
      if (disableIntroCheck || !player.currentGame) {
        return;
      }

      const game = isGame(player.currentGame);
      const treatment = factorsSchema.parse(game.get("treatment"));
      const playerCount = treatment["playerCount"] as number;
      const readyPlayers = game.players.filter(
        (p) => p.get("introDone") && !p.get("ended")
      );

      if (readyPlayers.length < playerCount) {
        trace("introDone: not enough players ready yet");

        return;
      }

      if (game.hasStarted) {
        trace("introDone: game already started");

        return;
      }

      game.set("starting", true);

      const players = selectRandom(readyPlayers, playerCount);

      const playersIDS = players.map((p) => p.id);
      for (const plyr of game.players) {
        if (!playersIDS.includes(plyr.id)) {
          plyr.set("gameID", null);
          trace("introDone: unassigning player - REASSIGNING", plyr.id);
          await assignplayer(ctx, plyr, [game.id]);
        }
      }

      trace("introDone: starting game");
      game.start();
    }

    _.on("player", "introDone", async (ctx, { player }: { player: Player }) => {
      await introDoneCheck(ctx, player);
    });

    _.on(
      "player",
      "replayGameReadyCheck",
      async (
        ctx,
        {
          player,
          replayGameReadyCheck,
        }: { player: Player; replayGameReadyCheck: boolean }
      ) => {
        if (!replayGameReadyCheck) {
          return;
        }

        player.set("replayGameReadyCheck", false);
        await introDoneCheck(ctx, player);
      }
    );

    // If a player gets their ended state reset, try to reassign them.
    _.on(
      "player",
      "ended",
      async (
        ctx,
        { player, ended }: { player: Player; ended: string | undefined }
      ) => {
        const participantID = player.get("participantID");
        if (
          player.currentGame ||
          ended ||
          !participantID ||
          !online.has(participantID as string)
        ) {
          return;
        }

        await assignplayer(ctx, player);
      }
    );

    type BeforeGameStart = { game: Game; start: boolean };
    _.unique.before(
      "game",
      "start",
      async (_, { game, start }: BeforeGameStart) => {
        if (!start) {
          return;
        }

        // await Promise.all(
        //   game.players.map((player) => game.createPlayerGame(player))
        // );
        await game.createPlayerGames(game.players);
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

        await Promise.all(
          game.players.map((player) => round.createPlayerRound(player))
        );
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

        if (stage.get("initialized")) {
          return;
        }

        const game = isGame(stage.currentGame);

        await Promise.all(
          game.players.map((player) => stage.createPlayerStage(player))
        );

        stage.set("initialized", true, { private: true, immutable: true });
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

        if (stage.get("started") || !stage.get("initialized")) {
          return;
        }
        stage.set("started", true, { private: true, immutable: true });

        const game = isGame(stage.currentGame);

        const timerID = isString(stage.get("timerID"));

        const participantIDs: string[] = [];
        const nodeIDs = [stage.id, timerID];
        for (const player of game.players) {
          participantIDs.push(player.participantID!);
          nodeIDs.push(isString(player.get(`playerStageID-${stage.id}`)));
        }

        ctx.addLinks([{ link: true, participantIDs, nodeIDs }]);

        ctx
          .addTransitions([
            {
              from: State.Created,
              to: State.Running,
              nodeID: timerID,
              cause: "stage start",
            },
          ])
          .catch((err) => {
            debug(`stage start: ${err}`);
          })
          .then(() => {
            trace(`stage start, transitioned`);
          });
      }
    );

    type PlayerStageSubmit = { playerStage: PlayerStage; submit: boolean };
    _.after(
      "playerStage",
      "submit",
      (ctx, { playerStage, submit }: PlayerStageSubmit) => {
        if (!submit) return;

        if (!playerStage.stage || !playerStage.stage.isCurrent()) {
          return;
        }

        const players = playerStage.player!.currentGame!.players;
        if (players.length === 0) {
          warn("callbacks: no players onSubmit");
          return;
        }

        const haveAllPlayersSubmitted = players.every(
          (p) =>
            p.get("ended") ||
            !online.has(p.get("participantID")?.toString() as string) ||
            p.stage?.get("submit")
        );

        if (haveAllPlayersSubmitted) {
          ctx
            .addTransitions([
              {
                from: State.Running,
                to: State.Ended,
                nodeID: isString(playerStage.stage!.get("timerID")),
                cause: "players submitted",
              },
            ])
            .catch((err) => {
              debug(`players submitted: ${err}`);
            })
            .then(() => {
              trace(`all player submitted, transitioned`);
            });
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
        const stage = stageForStepID.get(step.id);
        if (!stage) {
          return;
        }

        debug(`transition stage: ${from} => ${to}`);

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
