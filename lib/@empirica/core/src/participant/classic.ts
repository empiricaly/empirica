import { BehaviorSubject, Subject } from "rxjs";
import { Attributes } from "./attributes";
import { Globals } from "./globals";
import { TajribaProvider } from "./provider";
import { Constructor, Scope, Scopes } from "./scopes";
import { Steps } from "./steps";

export class Game extends Scope<Context, ClassicKinds> {
  get stage() {
    return this.scopeByKey("stageID") as Stage | undefined;
  }

  get round() {
    return this.stage?.round;
  }
}

export class Player extends Scope<Context, ClassicKinds> {
  get game() {
    const { game } = this.ctx;
    if (!game) {
      return;
    }

    return this.scopeByKey(`playerGameID-${game.id}`) as PlayerGame | undefined;
  }

  get round() {
    const { stage } = this.ctx;
    if (!stage) {
      return;
    }

    const { round } = stage;
    if (!round) {
      return;
    }

    return this.scopeByKey(`playerRoundID-${round.id}`) as
      | PlayerRound
      | undefined;
  }

  get stage() {
    const { stage } = this.ctx;
    if (!stage) {
      return;
    }

    return this.scopeByKey(`playerStageID-${stage.id}`) as
      | PlayerStage
      | undefined;
  }
}

export class PlayerGame extends Scope<Context, ClassicKinds> {}
export class PlayerRound extends Scope<Context, ClassicKinds> {}
export class PlayerStage extends Scope<Context, ClassicKinds> {}

export class Round extends Scope<Context, ClassicKinds> {}

export class Stage extends Scope<Context, ClassicKinds> {
  get round() {
    return this.scopeByKey("roundID") as Round | undefined;
  }

  get timer() {
    return this.tickerByKey("timerID");
  }
}

// TODO update context
export class Context {
  public game?: Game;
  public stage?: Stage;
}

type ClassicKinds = {
  game: Constructor<Game>;
  player: Constructor<Player>;
  playerGame: Constructor<PlayerGame>;
  playerRound: Constructor<PlayerRound>;
  playerStage: Constructor<PlayerStage>;
  round: Constructor<Round>;
  stage: Constructor<Stage>;
};

export const kinds = {
  game: Game,
  player: Player,
  playerGame: PlayerGame,
  playerRound: PlayerRound,
  playerStage: PlayerStage,
  round: Round,
  stage: Stage,
};

type ClassicContext = {
  game: BehaviorSubject<Game | undefined>;
  player: BehaviorSubject<Player | undefined>;
  players: BehaviorSubject<Player[]>;
  round: BehaviorSubject<Round | undefined>;
  stage: BehaviorSubject<Stage | undefined>;
  globals: BehaviorSubject<Globals>;
};

export function ClassicMode(
  playerID: string,
  provider: TajribaProvider,
  coarseReactivity: boolean = false
): ClassicContext {
  const attributesDones = new Subject<void>();
  const scopesDones = new Subject<void>();

  const ctx = new Context();
  const attributes = new Attributes(
    provider.attributes,
    attributesDones,
    provider.setAttributes
  );
  const steps = new Steps(provider.steps, provider.dones);
  const scopes = new Scopes(
    provider.scopes,
    scopesDones,
    ctx,
    kinds,
    attributes,
    steps
  );
  const participants = new Set<string>();

  const glob = new Globals(provider.globals);

  const ret = {
    game: new BehaviorSubject<Game | undefined>(undefined),
    player: new BehaviorSubject<Player | undefined>(undefined),
    players: new BehaviorSubject<Player[]>([]),
    round: new BehaviorSubject<Round | undefined>(undefined),
    stage: new BehaviorSubject<Stage | undefined>(undefined),
    globals: glob.self,
  };

  provider.participants.subscribe({
    next: ({ participant, removed }) => {
      if (removed) {
        if (participants.has(participant.id)) {
          participants.delete(participant.id);
        }
      } else {
        if (!participants.has(participant.id)) {
          participants.add(participant.id);
        }
      }
    },
  });

  provider.dones.subscribe({
    next: () => {
      scopesDones.next();
      attributesDones.next();
      // let gameUpdated = false;
      // let stageUpdated = false;
      // let roundUpdated = false;
      // let playerUpdated = false;
      // let playersUpdated = false;

      // if (!player || player.id !== playerID) {
      //   player = scopes.scope(playerID) as Player;
      //   playerUpdated = true;
      // }

      // const games = scopes.byKind("game") as Map<string, Game>;
      // switch (games?.size) {
      //   case 0:
      //     if (game) {
      //       game = undefined;
      //       gameUpdated = true;
      //     }

      //     if (round) {
      //       round = undefined;
      //       roundUpdated = true;
      //     }

      //     if (stage) {
      //       stage = undefined;
      //       stageUpdated = true;
      //     }

      //     break;
      //   case 1:
      //     for (const [gameID, g] of games) {
      //       if (!game) {
      //         game = g;
      //         gameUpdated = true;
      //       } else if (gameID !== game.id) {
      //         console.log("classic: game changed?!");

      //         game = g;
      //         gameUpdated = true;
      //       }
      //     }

      //     break;
      //   case undefined:
      //     return;
      //   default:
      //     //? why more than 1 game (☉_☉)
      //     return;
      // }

      // if (game) {
      //   const stageID = game.get("stageID");
      //   if (!stage || stageID !== stage.id) {
      //     if (typeof stageID !== "string") {
      //       console.error("classic: stageID is not a string");

      //       return;
      //     } else {
      //       stage = scopes.scope(stageID) as Stage;
      //       stageUpdated = true;
      //     }
      //   }

      //   if (stage) {
      //     const roundID = stage.get("roundID");
      //     if (roundID) {
      //       if (!round || roundID !== round.id) {
      //         if (typeof roundID !== "string") {
      //           console.error("classic: roundID is not a string");

      //           return;
      //         } else {
      //           round = scopes.scope(roundID) as Round;
      //           roundUpdated = true;
      //         }
      //       }
      //     } else if (round) {
      //       round = undefined;
      //       roundUpdated = true;
      //     }
      //   } else {
      //     if (round) {
      //       round = undefined;
      //       roundUpdated = true;
      //     }
      //   }

      //   const playerIDs = game.get("playerIDs") as string[];
      //   if (playerIDs && Array.isArray(playerIDs) && playerIDs.length > 0) {
      //     const sameLen = curPlayers.length === playerID.length;
      //     if (
      //       !sameLen ||
      //       playerIDs.find((id, index) => curPlayers[index]?.id !== id)
      //     ) {
      //       curPlayers = [];
      //       for (const playerID of playerIDs) {
      //         if (!participants.has(playerID)) {
      //           continue;
      //         }

      //         const p = scopes.scope(playerID) as Player;
      //         if (p) {
      //           curPlayers.push(p);
      //         }
      //       }

      //       playersUpdated = true;
      //     }
      //   } else if (curPlayers.length > 0) {
      //     curPlayers = [];
      //     playersUpdated = true;
      //   }
      // }

      // if (coarseReactivity) {
      //   if (attributes.scopeWasUpdated(game?.id)) {
      //     gameUpdated = true;
      //   }

      //   if (attributes.scopeWasUpdated(round?.id)) {
      //     roundUpdated = true;
      //   }

      //   if (attributes.scopeWasUpdated(stage?.id)) {
      //     stageUpdated = true;
      //   }

      //   if (attributes.scopeWasUpdated(player?.id)) {
      //     playerUpdated = true;
      //   }

      //   for (const player of curPlayers) {
      //     if (attributes.scopeWasUpdated(player?.id)) {
      //       playersUpdated = true;
      //       break;
      //     }
      //   }
      // }

      // if (gameUpdated) {
      //   ret.game.next(game);
      // }

      // if (stageUpdated) {
      //   ret.stage.next(stage);
      // }

      // if (roundUpdated) {
      //   ret.round.next(round);
      // }

      // if (playerUpdated) {
      //   ret.player.next(player);
      // }

      // if (playersUpdated) {
      //   ret.players.next(curPlayers);
      // }
    },
  });

  return ret;
}
