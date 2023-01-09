import { BehaviorSubject, Subject } from "rxjs";
import { Attributes } from "../../shared/attributes";
import { Globals } from "../../shared/globals";
import { Constructor } from "../../shared/helpers";
import { TajribaProvider } from "../provider";
import { Scope, Scopes } from "../scopes";
import { Steps } from "../steps";

export const endedStatuses = ["ended", "terminated", "failed"];
export type EndedStatuses = typeof endedStatuses[number];

export class Game extends Scope<Context, EmpiricaClassicKinds> {
  get hasEnded() {
    return endedStatuses.includes(this.get("status") as EndedStatuses);
  }

  get stage() {
    return this.scopeByKey("stageID") as Stage | undefined;
  }

  get round() {
    return this.stage?.round;
  }
}

export class Player extends Scope<Context, EmpiricaClassicKinds> {
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

export class PlayerGame extends Scope<Context, EmpiricaClassicKinds> {}

export class PlayerRound extends Scope<Context, EmpiricaClassicKinds> {}

export class PlayerStage extends Scope<Context, EmpiricaClassicKinds> {}

export class Round extends Scope<Context, EmpiricaClassicKinds> {}

export class Stage extends Scope<Context, EmpiricaClassicKinds> {
  get round() {
    return this.scopeByKey("roundID") as Round | undefined;
  }

  get timer() {
    return this.tickerByKey("timerID");
  }
}

// TODO update context
class Context {
  public game?: Game;
  public stage?: Stage;
}

type EmpiricaClassicKinds = {
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

export type EmpiricaClassicContext = {
  game: BehaviorSubject<Game | undefined>;
  player: BehaviorSubject<Player | undefined>;
  players: BehaviorSubject<Player[]>;
  round: BehaviorSubject<Round | undefined>;
  stage: BehaviorSubject<Stage | undefined>;
  globals: BehaviorSubject<Globals>;
};

export function EmpiricaClassic(
  participantID: string,
  provider: TajribaProvider
): EmpiricaClassicContext {
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
  const participantIDs = new Set<string>();

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
        if (participantIDs.has(participant.id)) {
          participantIDs.delete(participant.id);
        }
      } else {
        if (!participantIDs.has(participant.id)) {
          participantIDs.add(participant.id);
        }
      }
    },
  });

  provider.dones.subscribe({
    next: () => {
      const current = getCurrent(ret);
      const updated = getMainObjects(participantID, scopes, attributes);
      ctx.game = updated.game;
      ctx.stage = updated.stage;

      if (scopeChanged(current.game, updated.game)) {
        ret.game.next(updated.game);
      }

      if (scopeChanged(current.player, updated.player)) {
        ret.player.next(updated.player);
      }

      if (scopeChanged(current.round, updated.round)) {
        ret.round.next(updated.round);
      }

      if (scopeChanged(current.stage, updated.stage) || steps.hadUpdates()) {
        ret.stage.next(updated.stage);
      }

      let playersChanged = false;
      const players: Player[] = [];
      for (let i = 0; i < updated.players.length; i++) {
        let p = updated.players[i];

        if (p) {
          const partID = attributes.nextAttributeValue(
            p.id,
            "participantID"
          ) as string;
          if (!participantIDs.has(partID)) {
            p = undefined;
          }
        }

        if (!playersChanged && scopeChanged(p, current.players[i])) {
          playersChanged = true;
        }

        if (p) {
          players.push(p);
        }
      }
      if (playersChanged) {
        ret.players.next(players);
      }

      scopesDones.next();
      attributesDones.next();
    },
  });

  return ret;
}

type mainObjects = {
  game?: Game;
  player?: Player;
  round?: Round;
  stage?: Stage;
  players: Player[];
};

function scopeChanged(
  current?: Scope<Context, EmpiricaClassicKinds>,
  updated?: Scope<Context, EmpiricaClassicKinds>
): boolean {
  if (!current && !updated) {
    return false;
  }

  if (!current || !updated) {
    return true;
  }

  return current.id !== updated.id || updated.hasUpdated();
}

function getCurrent(ctx: EmpiricaClassicContext): mainObjects {
  return {
    game: ctx.game.getValue(),
    player: ctx.player.getValue(),
    round: ctx.round.getValue(),
    stage: ctx.stage.getValue(),
    players: ctx.players.getValue(),
  };
}

function getMainObjects(
  participantID: string,
  scopes: Scopes<Context, EmpiricaClassicKinds>,
  attributes: Attributes
): mainObjects {
  const players = scopes.byKind("player");

  const res: mainObjects = {
    players: Array.from(players.values()) as Player[],
  };

  if (players.size === 0) {
    return res;
  }

  res.player = Array.from(players.values()).find((p) => {
    const pID = attributes.nextAttributeValue(p.id, "participantID") as string;
    return pID === participantID;
  }) as Player;

  if (!res.player) {
    return res;
  }

  res.game = nextScopeByKey(scopes, attributes, res.player, "gameID") as Game;
  if (!res.game) {
    return res;
  }

  for (const player of res.players) {
    const key = `playerGameID-${res.game.id}`;
    if (!nextScopeByKey(scopes, attributes, player, key)) {
      return res;
    }
  }

  res.stage = nextScopeByKey(scopes, attributes, res.game, "stageID") as Stage;
  if (!res.stage) {
    return res;
  }

  for (const player of res.players) {
    const key = `playerStageID-${res.stage.id}`;
    if (!nextScopeByKey(scopes, attributes, player, key)) {
      delete res.stage;
      return res;
    }
  }

  res.round = nextScopeByKey(scopes, attributes, res.stage, "roundID") as Round;
  if (!res.round) {
    return res;
  }

  for (const player of res.players) {
    const key = `playerRoundID-${res.round.id}`;
    if (!nextScopeByKey(scopes, attributes, player, key)) {
      delete res.stage;
      delete res.round;
      return res;
    }
  }

  return res;
}

function nextScopeByKey(
  scopes: Scopes<Context, EmpiricaClassicKinds>,
  attributes: Attributes,
  scope: Scope<Context, EmpiricaClassicKinds>,
  key: string
) {
  const id = attributes.nextAttributeValue(scope.id, key);
  if (!id || typeof id !== "string") {
    return;
  }

  return scopes.scope(id);
}
