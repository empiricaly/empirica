import { AddStepInput, State, Step, Transition } from "@empirica/tajriba";
import { z } from "zod";
import { error } from "../../utils/console";
import { StepPayload } from "../context";
import { EventContext, ListenersCollector, TajribaEvent } from "../events";
import {
  ClassicKinds,
  Context,
  Game,
  lobbyConfigSchema,
  Player,
} from "./models";

export type LobbyConfig = {};

export function Lobby(config: LobbyConfig = {}) {
  return function (_: ListenersCollector<Context, ClassicKinds>) {
    _.on("player", "introDone", async (ctx, { player }: { player: Player }) => {
      const game = player.currentGame;
      if (!game) {
        return;
      }

      const lobbyConfig = game.lobbyConfig;

      switch (lobbyConfig.kind) {
        case "global":
          await setupGlobalLobby(ctx, game, lobbyConfig);

          break;
        case "individual":
          // TODO
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

        const games = ctx.scopesByKindMatching<Game>(
          "game",
          "lobbyTimerID",
          step.id
        );

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
            game.end("failed", "lobby timer ended");

            break;
          case "ignore":
            // TODO game.start();

            break;
        }
      }
    );
  };
}

async function setupGlobalLobby(
  ctx: EventContext<Context, ClassicKinds>,
  game: Game,
  lobbyConfig: z.infer<typeof lobbyConfigSchema>
) {
  if (game.get("lobbyTimerID")) {
    return;
  }

  const stepID = await getTimer(ctx, lobbyConfig.duration);
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
