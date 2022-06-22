import { z } from "zod";
import { Constructor } from "../../shared/helpers";
import { Scope } from "../../shared/scopes";
import { ListenersCollector } from "../events";

const stringArray = z.string().array();
const string = z.string();

export function ClassicLoader(subs: ListenersCollector<Context, ClassicKinds>) {
  subs.on("start", function (ctx) {
    ctx.scopeSub({ kinds: ["Batch"] });
    ctx.participantsSub();
  });

  subs.on("batch", "gameIDs", function (ctx, { gameIDs }) {
    ctx.scopeSub({ ids: stringArray.parse(gameIDs) });
  });

  subs.on("game", "playerIDs", function (ctx, { playerIDs }) {
    ctx.scopeSub({ ids: stringArray.parse(playerIDs) });
  });

  subs.on("game", "stageIDs", function (ctx, { stageIDs }) {
    ctx.scopeSub({ ids: stringArray.parse(stageIDs) });
  });

  subs.on("stage", "roundID", function (ctx, { roundID }) {
    ctx.scopeSub({ ids: [string.parse(roundID)] });
  });

  subs.on("stage", "roundID", function (ctx, { roundID }) {
    ctx.scopeSub({ ids: [string.parse(roundID)] });
  });

  subs.on("stage", "timerID", function (ctx, { timerID }) {
    ctx.transitionsSub(timerID);
  });

  subs.on("player", "playerGameID*", function (ctx, { playerGameID }) {
    ctx.scopeSub({ ids: [string.parse(playerGameID)] });
  });

  subs.on("player", "playerRoundID*", function (ctx, { playerRoundID }) {
    ctx.scopeSub({ ids: [string.parse(playerRoundID)] });
  });

  subs.on("player", "playerStageID*", function (ctx, { playerStageID }) {
    ctx.scopeSub({ ids: [string.parse(playerStageID)] });
  });
}

export class Batch extends Scope<Context, ClassicKinds> {}
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
    const key = `playerGameID-${game.id}`;
    return this.scopeByKey(key) as PlayerGame | undefined;
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
    const key = `playerRoundID-${round.id}`;
    return this.scopeByKey(key) as PlayerRound | undefined;
  }
  get stage() {
    const { stage } = this.ctx;
    if (!stage) {
      return;
    }
    const key = `playerStageID-${stage.id}`;
    return this.scopeByKey(key) as PlayerStage | undefined;
  }
  hasUpdated() {
    if (super.hasUpdated()) {
      return true;
    }
    return Boolean(
      this.round?.hasUpdated() ||
        this.stage?.hasUpdated() ||
        this.game?.hasUpdated()
    );
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
  // get timer() {
  //   return this.tickerByKey("timerID");
  // }
}

// TODO update context
class Context {
  public game?: Game;
  public stage?: Stage;
}

export type ClassicKinds = {
  batch: Constructor<Batch>;
  game: Constructor<Game>;
  player: Constructor<Player>;
  playerGame: Constructor<PlayerGame>;
  playerRound: Constructor<PlayerRound>;
  playerStage: Constructor<PlayerStage>;
  round: Constructor<Round>;
  stage: Constructor<Stage>;
};

export const classicKinds = {
  batch: Batch,
  game: Game,
  player: Player,
  playerGame: PlayerGame,
  playerRound: PlayerRound,
  playerStage: PlayerStage,
  round: Round,
  stage: Stage,
};
