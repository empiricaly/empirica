import {
  AttributeChange,
  ScopeChange,
  SetAttributeInput,
  SubAttributesPayload,
} from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { JsonValue } from "../utils/json";
import { TajribaProvider } from "./provider";

export interface AttributeOptions {
  /**
   * Private indicates the attribute will not be visible to other Participants.
   */
  private: boolean;
  /**
   * Protected indicates the attribute will not be updatable by other
   * Participants.
   */
  protected: boolean;
  /** Immutable creates an Attribute that cannot be updated. */
  immutable: boolean;
  /** Vector indicates the value is a vector. */
  vector: boolean;
  /**
   * Index, only used if the Attribute is a vector, indicates which index to
   * update the value at.
   */
  index: number | null;
  /**
   * Append, only used if the Attribute is a vector, indicates to append the
   * attribute to the vector.
   */
  append: boolean | null;
}

class Attribute {
  private attr: AttributeChange | null = null;
  private val = new BehaviorSubject<JsonValue>(null);

  constructor(
    private attrs: Attributes,
    readonly scopeID: string,
    readonly key: string
  ) {}

  get obs(): Observable<JsonValue> {
    return this.val;
  }

  get value() {
    return this.val.getValue();
  }

  set(value: JsonValue, ao?: Partial<AttributeOptions>) {
    this.val.next(value);

    const attrProps = {
      key: this.key,
      nodeID: this.scopeID,
      val: JSON.stringify(value),
    };

    if (ao) {
      // TODO Fix this. Should check if compatible with existing attribute and
      // only set fields set on ao.
      ao.private = ao.private;
      ao.protected = ao.protected;
      ao.immutable = ao.immutable;
      ao.append = ao.append;
      ao.vector = ao.vector;
      ao.index = ao.index;
    }

    this.attrs.setAttributes([attrProps]);
  }

  // internal only
  _update(attr: AttributeChange | null) {
    this.attr = attr;
    let value: JsonValue = null;
    if (this.attr?.val) {
      value = JSON.parse(this.attr.val);
    }
    this.val.next(value);
  }
}

class Attributes {
  private attrs = new Map<string, Map<string, Attribute>>();
  private updates = new Map<string, Map<string, AttributeChange | boolean>>();

  constructor(
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<void>
  ) {}

  attribute(scopeID: string, key: string): Attribute {
    let scopeMap = this.attrs.get(scopeID);
    if (!scopeMap) {
      scopeMap = new Map();
      this.attrs.set(scopeID, scopeMap);
    }

    let attr = scopeMap.get(key);
    if (!attr) {
      attr = new Attribute(this, scopeID, key);
      scopeMap.set(key, attr);
    }

    return attr;
  }

  update(attr: AttributeChange, removed: boolean) {
    let scopeMap = this.updates.get(attr.nodeID);
    if (!scopeMap) {
      scopeMap = new Map();
      this.updates.set(attr.nodeID, scopeMap);
    }

    if (removed) {
      scopeMap.set(attr.key, true);
    } else {
      scopeMap.set(attr.key, attr);
    }
  }

  scopeWasUpdated(scope: Scope | undefined): boolean {
    if (!scope) {
      return false;
    }

    return this.updates.has(scope.id);
  }

  next() {
    for (const [scopeID, attrs] of this.updates) {
      let scopeMap = this.attrs.get(scopeID);

      if (!scopeMap) {
        scopeMap = new Map();
        this.attrs.set(scopeID, scopeMap);
      }

      for (const [key, attrOrDel] of attrs) {
        let attr = scopeMap.get(key);
        if (typeof attrOrDel === "boolean") {
          if (attr) {
            attr._update(null);
          }
        } else {
          if (!attr) {
            attr = new Attribute(this, scopeID, key);
            scopeMap.set(key, attr);
          }

          attr._update(attrOrDel);
        }
      }
    }

    this.updates.clear();
  }
}

class Scope {
  deleted = false;
  constructor(readonly scope: ScopeChange, private attributes: Attributes) {}

  get id() {
    return this.scope.id;
  }

  get kind() {
    return this.scope.kind || "";
  }

  get(key: string): JsonValue {
    return this.attributes.attribute(this.scope.id, key).value;
  }

  sub(key: string): Observable<JsonValue> {
    return this.attributes.attribute(this.scope.id, key).obs;
  }

  set(key: string, value: JsonValue) {
    return this.attributes.attribute(this.scope.id, key).set(value);
  }
}

class Game extends Scope {}
class Player extends Scope {}
class Round extends Scope {}
class Stage extends Scope {}

const kinds = {
  game: Game,
  player: Player,
  round: Round,
  stage: Stage,
};

class Globals {
  private attrs = new Map<string, BehaviorSubject<JsonValue>>();
  public self: BehaviorSubject<Globals> | undefined;

  constructor(globals: Observable<SubAttributesPayload>) {
    globals.subscribe({
      next: ({ attribute, done }) => {
        if (attribute) {
          let val = null;
          if (attribute.val) {
            val = JSON.parse(attribute.val);
          }

          this.obs(attribute.key).next(val);
        }

        if (done && this.self) {
          this.self.next(this);
        }
      },
    });
  }

  get(key: string) {
    const o = this.attrs.get(key);
    if (o) {
      return o.getValue();
    }

    return null as JsonValue;
  }

  obs(key: string) {
    let o = this.attrs.get(key);
    if (!o) {
      o = new BehaviorSubject<JsonValue>(null);
      this.attrs.set(key, o);
    }

    return o;
  }
}

export function ClassicMode(
  playerID: string,
  provider: TajribaProvider,
  coarseReactivity: boolean = false
) {
  const attributes = new Attributes(provider.setAttributes);
  let scopesUpdated = false;
  let updated = new Set<string>();

  const scopes = new Map<string, Scope>();
  const games = new Map<string, Game>();
  const players = new Map<string, Player>();
  const rounds = new Map<string, Round>();
  const stages = new Map<string, Stage>();

  let game: Game | undefined;
  let player: Player | undefined;
  let curPlayers: Player[] = [];
  let round: Round | undefined;
  let stage: Stage | undefined;

  const glob = new Globals(provider.globals);
  const globals = new BehaviorSubject(glob);
  glob.self = globals;

  const ret = {
    game: new BehaviorSubject<Game | undefined>(undefined),
    player: new BehaviorSubject<Player | undefined>(undefined),
    players: new BehaviorSubject<Player[]>([]),
    round: new BehaviorSubject<Round | undefined>(undefined),
    stage: new BehaviorSubject<Stage | undefined>(undefined),
    globals,
  };

  provider.scopes.subscribe({
    next: ({ scope, removed }) => {
      if (removed) {
        const existing = scopes.get(scope.id);
        if (existing) {
          existing.deleted = true;
        } else {
          console.warn("classic: missing scope");

          return;
        }
      } else {
        const existing = scopes.get(scope.id);
        if (existing) {
          existing.deleted = false;
          console.warn("classic: replacing scope");
        }

        if (!scope.kind) {
          console.warn("classic: scope missing kind on scope");

          return;
        }

        const kind = kinds[scope.kind as keyof typeof kinds];
        if (!kind) {
          console.warn(`classic: unknown scope kind: ${scope.kind}`);

          return;
        }

        const obj = new kind(scope, attributes);
        scopes.set(scope.id, obj);

        switch (kind) {
          case Game:
            games.set(scope.id, obj);

            break;
          case Player:
            players.set(scope.id, obj);

            break;
          case Round:
            rounds.set(scope.id, obj);

            break;
          case Stage:
            stages.set(scope.id, obj);

            break;
        }
      }

      scopesUpdated = true;
    },
  });

  provider.attributes.subscribe({
    next: ({ attribute, removed }) => {
      attributes.update(attribute, removed);

      updated.add(attribute.nodeID);
    },
  });

  provider.dones.subscribe({
    next: () => {
      if (!scopesUpdated) {
        // Do something different?
      }
      scopesUpdated = false;

      let gameUpdated = false;
      let stageUpdated = false;
      let roundUpdated = false;
      let playerUpdated = false;
      let playersUpdated = false;

      if (!player || player.id !== playerID) {
        player = players.get(playerID);
        playerUpdated = true;
      }

      switch (games.size) {
        case 0:
          if (game) {
            game = undefined;
            gameUpdated = true;
          }

          if (round) {
            round = undefined;
            roundUpdated = true;
          }

          if (stage) {
            stage = undefined;
            stageUpdated = true;
          }

          break;
        case 1:
          for (const [gameID, g] of games) {
            if (!game) {
              game = g;
              gameUpdated = true;
            } else if (gameID !== game.id) {
              console.log("classic: game changed?!");

              game = g;
              gameUpdated = true;
            }
          }

          break;
        default:
          // TODO why more than 1 game (☉_☉)
          return;
      }

      if (game) {
        const stageID = game.get("stageID");
        if (!stage || stageID !== stage.id) {
          if (typeof stageID !== "string") {
            console.error("classic: stageID is not a string");

            return;
          } else {
            stage = stages.get(stageID);
            stageUpdated = true;
          }
        }

        if (stage) {
          const roundID = stage.get("roundID");
          if (roundID) {
            if (!round || roundID !== round.id) {
              if (typeof roundID !== "string") {
                console.error("classic: roundID is not a string");

                return;
              } else {
                round = rounds.get(roundID);
                roundUpdated = true;
              }
            }
          } else if (round) {
            round = undefined;
            roundUpdated = true;
          }
        } else {
          if (round) {
            round = undefined;
            roundUpdated = true;
          }
        }

        const playerIDs = game.get("playerIDs") as string[];
        if (playerIDs && Array.isArray(playerIDs) && playerIDs.length > 0) {
          const sameLen = curPlayers.length === playerID.length;
          if (
            !sameLen ||
            playerIDs.find((id, index) => curPlayers[index].id !== id)
          ) {
            curPlayers = [];
            for (const playerID of playerIDs) {
              const p = players.get(playerID);
              if (p) {
                curPlayers.push(p);
              }
            }

            playersUpdated = true;
          }
        } else if (curPlayers.length > 0) {
          curPlayers = [];
          playersUpdated = true;
        }
      }

      if (coarseReactivity) {
        if (attributes.scopeWasUpdated(game)) {
          gameUpdated = true;
        }

        if (attributes.scopeWasUpdated(round)) {
          roundUpdated = true;
        }

        if (attributes.scopeWasUpdated(stage)) {
          stageUpdated = true;
        }

        if (attributes.scopeWasUpdated(player)) {
          playerUpdated = true;
        }

        for (const player of curPlayers) {
          if (attributes.scopeWasUpdated(player)) {
            playersUpdated = true;
            break;
          }
        }
      }

      if (gameUpdated) {
        ret.game.next(game);
      }

      if (stageUpdated) {
        ret.stage.next(stage);
      }

      if (roundUpdated) {
        ret.round.next(round);
      }

      if (playerUpdated) {
        ret.player.next(player);
      }

      if (playersUpdated) {
        ret.players.next(curPlayers);
      }

      attributes.next();
    },
  });

  return ret;
}
