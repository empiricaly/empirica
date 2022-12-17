import { AddStepInput, State, Step, Transition } from "@empirica/tajriba";
import { error } from "../../utils/console";
import { StepPayload } from "../context";
import { EventContext, ListenersCollector, TajribaEvent } from "../events";
import { ClassicKinds, Context, Game, Player } from "./models";

export type LobbyConfig = {};

export function Lobby(_: LobbyConfig = {}) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    _.on("player", "introDone", async (ctx, { player }: { player: Player }) => {
      const game = player.currentGame;
      if (!game) {
        return;
      }

      const lobbyConfig = game.lobbyConfig;

      switch (lobbyConfig.kind) {
        case "shared":
          await setupSharedLobbyTimeout(ctx, game);

          break;
        case "individual":
          await setupIndividualLobbyTimeout(ctx, game, player);

          break;
      }
    });

    type TransitionAdd = { step: Step; transition: Transition };
    _.on(
      TajribaEvent.TransitionAdd,
      (ctx, { step, transition: { from, to } }: TransitionAdd) => {
        if (!(from === State.Running && to === State.Ended)) {
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

const individualTimerKey = `lobbyTimerID`;
const individualTimerGameKey = `lobbyTimerGameID`;
const individualTimerExtensionsKey = `lobbyTimerExtensionsForGameID`;

async function setupIndividualLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  game: Game,
  player: Player
) {
  // We check both whether there is a timer and if it was set for the current
  // game. If the player switches games, the old timer should be ignored.
  if (
    player.get(individualTimerKey) &&
    player.get(individualTimerGameKey) === game.id
  ) {
    return;
  }

  const stepID = await getTimer(ctx, game.lobbyConfig.duration);
  if (!stepID) {
    error("lobby: timer not created");

    return;
  }

  player.set(individualTimerKey, stepID);
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
    individualTimerKey,
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

  if (!lobbyConfig.extensions || lobbyConfig.extensions === 0) {
    return;
  }

  const extensionsKey = `${individualTimerExtensionsKey}-${game.id}`;
  const extensions = (player.get(extensionsKey) as number) || 0;

  if (extensions >= lobbyConfig.extensions) {
    player.set("ended", "individual lobby timeout");

    return;
  }

  // Clear previous timeout
  player.set(individualTimerKey, null);

  player.set(extensionsKey, extensions + 1);

  setupIndividualLobbyTimeout(ctx, game, player);
}

//
// Shared lobby timer
//

async function setupSharedLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  game: Game
) {
  if (game.get("lobbyTimerID")) {
    return;
  }

  const stepID = await getTimer(ctx, game.lobbyConfig.duration);
  if (!stepID) {
    error("lobby: timer not created");

    return;
  }

  game.set("lobbyTimerID", stepID);

  ctx.addTransitions([
    {
      from: State.Created,
      to: State.Running,
      nodeID: stepID,
      cause: "lobby timer start",
    },
  ]);
}

async function expiredSharedLobbyTimeout(
  ctx: EventContext<Context, ClassicKinds>,
  step: Step
) {
  const games = ctx.scopesByKindMatching<Game>("game", "lobbyTimerID", step.id);

  if (!games.length) {
    return;
  }

  const game = games[0]!;

  if (game.hasStarted) {
    return;
  }

  const lobbyConfig = game.lobbyConfig;

  switch (lobbyConfig.strategy) {
    case "fail":
      game.end("failed", "shared lobby timeout");

      break;
    case "ignore":
      game.start();

      break;
  }
}

interface stepper {
  addSteps: (input: AddStepInput[]) => Promise<StepPayload[]>;
}

async function getTimer(ctx: stepper, duration: number) {
  try {
    const steps = await ctx.addSteps([{ duration }]);
    return steps[0]?.id;
  } catch (err) {
    return;
  }
}
