import { AddStepInput, State, Step, Transition } from "@empirica/tajriba";
import { z } from "zod";
import { error } from "../../utils/console";
import { StepPayload } from "../context";
import { EventContext, ListenersCollector, TajribaEvent } from "../events";
import { ClassicKinds, Context, Game, Player } from "./models";

const nanosecond = 1;
const microsecond = 1000 * nanosecond;
const millisecond = 1000 * microsecond;
const second = 1000 * millisecond;

const lobbyTimerKey = "lobbyTimerID";
const individualTimerGameKey = "lobbyTimerGameID";
const individualTimerExtensionsKey = "lobbyTimerExtensionsForGameID";

export type LobbyConfig = {};

export function Lobby(_: LobbyConfig = {}) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    _.on("player", "introDone", async (ctx, { player }: { player: Player }) => {
      console.log("lobby intro done");
      const game = player.currentGame;
      if (!game) {
        return;
      }

      console.log("lobby intro done", game.batch?.inspect());
      console.log("lobby intro done", game.batch?.get("lobbyConfig"));
      console.log("lobby intro done", game.lobbyConfig);

      switch (game.lobbyConfig.kind) {
        case "shared":
          await setupSharedLobbyTimeout(ctx, game);

          break;
        case "individual":
          await setupIndividualLobbyTimeout(ctx, game, player);

          break;
      }
    });

    const string = z.string();

    _.on("game", lobbyTimerKey, function (ctx, params) {
      ctx.transitionsSub(string.parse(params[lobbyTimerKey]));
    });

    _.on("player", lobbyTimerKey, function (ctx, params) {
      ctx.transitionsSub(string.parse(params[lobbyTimerKey]));
    });

    type TransitionAdd = { step: Step; transition: Transition };
    _.on(
      TajribaEvent.TransitionAdd,
      (ctx, { step, transition: { from, to } }: TransitionAdd) => {
        console.log("lobby transition check");
        if (from !== State.Running || to !== State.Ended) {
          return;
        }

        expiredSharedLobbyTimeout(ctx, step);
        expiredIndividualLobbyTimeout(ctx, step);
      }
    );
  };
}

//
// Individual lobby timer
//

async function setupIndividualLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  game: Game,
  player: Player
) {
  // We check both whether there is a timer and if it was set for the current
  // game. If the player switches games, the old timer should be ignored.
  if (
    player.get(lobbyTimerKey) &&
    player.get(individualTimerGameKey) === game.id
  ) {
    return;
  }

  const stepID = await getTimer(ctx, game.lobbyConfig.duration);
  if (!stepID) {
    error("lobby: timer not created");

    return;
  }

  player.set(lobbyTimerKey, stepID);
  player.set(individualTimerGameKey, game.id);

  ctx.addTransitions([
    {
      from: State.Created,
      to: State.Running,
      nodeID: stepID,
      cause: "lobby timer start",
    },
  ]);
}

async function expiredIndividualLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  step: Step
) {
  const players = ctx.scopesByKindMatching<Player>(
    "player",
    lobbyTimerKey,
    step.id
  );

  if (!players.length) {
    return;
  }

  const player = players[0]!;
  const game = player.currentGame;

  if (
    !game ||
    game.hasStarted ||
    player.get(individualTimerGameKey) !== game.id
  ) {
    return;
  }

  const lobbyConfig = game.lobbyConfig;

  // For now, no extensions, so always exit after player timeout.
  player.exit("lobby timed out");

  // if (!lobbyConfig.extensions || lobbyConfig.extensions === 0) {
  //   player.exit("lobby timed out");

  //   return;
  // }

  // const extensionsKey = `${individualTimerExtensionsKey}-${game.id}`;
  // const extensions = (player.get(extensionsKey) as number) || 0;

  // if (extensions >= lobbyConfig.extensions) {
  //   player.set("ended", "individual lobby timeout");

  //   return;
  // }

  // // Clear previous timeout
  // player.set(lobbyTimerKey, null);

  // player.set(extensionsKey, extensions + 1);

  // setupIndividualLobbyTimeout(ctx, game, player);
}

//
// Shared lobby timer
//

async function setupSharedLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  game: Game
) {
  if (game.get(lobbyTimerKey)) {
    console.log("lobby already exists", game.lobbyConfig);

    return;
  }

  const stepID = await getTimer(ctx, game.lobbyConfig.duration);
  if (!stepID) {
    error("lobby: timer not created");

    return;
  }

  console.log("lobby created", stepID);
  game.set(lobbyTimerKey, stepID);

  try {
    await ctx.addTransitions([
      {
        from: State.Created,
        to: State.Running,
        nodeID: stepID,
        cause: "lobby timer start",
      },
    ]);
  } catch (e) {
    console.log("failed to start lobby timeout", e);
  }
}

async function expiredSharedLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  step: Step
) {
  const games = ctx.scopesByKindMatching<Game>("game", lobbyTimerKey, step.id);

  if (!games.length) {
    console.log("game for lobby not found");

    return;
  }

  const game = games[0]!;
  console.log("lobby for game", game.id);

  if (game.hasStarted) {
    console.log("game for lobby started");

    return;
  }

  const readyPlayers = game.players.filter((p) => p.get("introDone"));
  if (readyPlayers.length === 0) {
    game.set(lobbyTimerKey, null);

    return;
  }

  switch (game.lobbyConfig.strategy) {
    case "fail":
      console.log("failing game");
      game.end("failed", "shared lobby timeout");

      break;
    case "ignore":
      console.log("starting game");
      game.start();

      break;
  }
}

interface stepper {
  addSteps: (input: AddStepInput[]) => Promise<StepPayload[]>;
}

async function getTimer(ctx: stepper, duration: number) {
  try {
    const dur = duration / second;
    console.log("creating lobby timeout for", dur, "seconds");
    const steps = await ctx.addSteps([{ duration: dur }]);
    return steps[0]?.id;
  } catch (err) {
    return;
  }
}
