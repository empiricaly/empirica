import {
  AttributeChange,
  ParticipantChange,
  ScopeChange,
  State,
} from "@empirica/tajriba";
import { Writable, writable } from "svelte/store";
import { JsonValue } from "./json";

export const hash = (s: string | undefined) =>
  s &&
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

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

export class EAttribute {
  public value: JsonValue = null;
  public ao?: Partial<AttributeOptions>;
  private isCompoundC?: boolean;
  private compoundElementsC?: {
    cType: string;
    cKey: string;
    subType: string;
    subID: string;
  };

  constructor(
    public scope: EScope,
    readonly key: string,
    public attribute?: AttributeChange
  ) {
    if (attribute) {
      this.update(attribute);
    }
  }

  get isCompound() {
    if (this.isCompoundC === undefined) {
      this.isCompoundC = this.attribute?.key.startsWith("##");
    }

    return this.isCompoundC;
  }

  get compoundElements() {
    if (!this.isCompound) {
      throw "attribute: not a compound key";
    }

    if (this.compoundElementsC === undefined) {
      let cKey = this.key;

      const [t, k] = cKey.slice(2).split("::");
      if (k === undefined) {
        throw "attribute: invalid compound key (::)";
      }
      cKey = k;

      const [cType, subID] = t.split(":");
      if (subID === undefined) {
        throw "attribute: invalid compound key (:)";
      }

      const [_, subType] = cType.split("-");
      if (subType === undefined) {
        throw "attribute: invalid compound key (-)";
      }

      this.compoundElementsC = { cType, cKey, subType, subID };
    }

    return this.compoundElementsC;
  }

  update(attribute: AttributeChange) {
    if (
      this.attribute &&
      (this.attribute.version > attribute.version ||
        this.attribute.val === attribute.val)
    ) {
      return;
    }

    this.attribute = attribute;

    if (attribute.val) {
      this.value = JSON.parse(attribute.val);
    }

    this.ao = {
      vector: attribute.vector,
      index: attribute.index,
    };

    return this;
  }
}

export interface getSetter {
  get: (key: string) => void;
  set: (key: string, val: JsonValue, ao?: Partial<AttributeOptions>) => void;
}

export function scopedScope(
  scope: EScope,
  subType: string,
  subID: string
): getSetter {
  const prefix = `##${scope.kind}-${subType}:${subID}::`;
  return {
    get: (key: string) => {
      return scope.get(`${prefix}${key}`);
    },
    set: (key: string, val: JsonValue, ao?: Partial<AttributeOptions>) => {
      scope.set(`${prefix}${key}`, val, ao);
    },
  };
}

export class EScope {
  public attributes: { [key: string]: EAttribute } = {};
  public scope?: ScopeChange;

  constructor(public store: Store) {}

  get hash() {
    return hash(this.id);
  }

  get id() {
    if (!this.scope) {
      throw "scope not created yet";
    }

    return this.scope.id;
  }

  get kind() {
    return this.constructor.name.toLowerCase();
  }

  get(key: string) {
    const a = this.attributes[key];
    if (!a) {
      return null;
    }

    return a.value;
  }

  set(key: string, val: JsonValue, ao?: Partial<AttributeOptions>) {
    const a = new EAttribute(this, key);
    a.value = val;
    a.ao = ao;
    this.attributes[key] = a;
    this.store.attributeChanged(a);
  }

  removeAttribute(attribute: AttributeChange) {
    if (this.attributes[attribute.key]) {
      delete this.attributes[attribute.key];
    }
  }

  updateAttribute(attribute: AttributeChange) {
    if (this.attributes[attribute.key]) {
      return this.attributes[attribute.key].update(attribute);
    }

    const a = new EAttribute(this, attribute.key);
    a.update(attribute);
    this.attributes[attribute.key] = a;

    return this.attributes[attribute.key];
  }
}

export class Player extends EScope {
  public games: Game[] = [];
  public online: boolean = false;
  public participant?: ParticipantChange;

  constructor(public store: Store) {
    super(store);
  }

  get id() {
    return this.participant?.id || this.scope?.id || "";
  }

  private get currentGame() {
    return this.store.games[this.get("gameID") as string];
  }

  get game() {
    if (!this.currentGame) {
      throw new Error("player.game outside of game context");
    }

    return scopedScope(this, "game", this.currentGame.id);
  }

  get round() {
    if (!this.currentGame?.currentStage?.round) {
      throw new Error("player.round outside of round context");
    }

    return scopedScope(this, "round", this.currentGame.currentStage.round.id);
  }

  get stage() {
    if (!this.currentGame?.currentStage) {
      throw new Error("player.stage outside of stage context");
    }

    return scopedScope(this, "stage", this.currentGame.currentStage.id);
  }
}

export class Root extends EScope {
  public batches: Batch[] = [];
}

export class Batch extends EScope {
  public games: Game[] = [];

  constructor(public store: Store) {
    super(store);
  }

  get config(): { [key: string]: any } {
    return (this.get("treatment") as { [key: string]: any }) || {};
  }
}

export class Game extends EScope {
  constructor(public store: Store) {
    super(store);
  }

  get state() {
    const state = this.get("state");
    if (state) {
      return (<string>state).toLowerCase();
    }

    return "created";
  }

  get batch() {
    const batchID = this.get("batchID") as string | undefined;
    return batchID && this.store.batches[batchID];
  }

  get currentStage(): Stage | undefined {
    const currentStageID = this.get("currentStageID") as string | undefined;
    // console.log("currentStage getter", hash(currentStageID));
    if (currentStageID) {
      return this.store.stages[currentStageID];
    }
  }

  get players() {
    const playerIDs: string[] =
      (this.get("playerIDs") as string[] | undefined) || [];
    const players = [];
    for (const playerID of playerIDs) {
      const player = this.store.players[playerID];
      if (player) {
        players.push(player);
      }
    }

    return players;
  }

  get rounds() {
    const roundIDs: string[] =
      (this.get("roundIDs") as string[] | undefined) || [];
    const rounds = [];
    for (const roundID of roundIDs) {
      const round = this.store.rounds[roundID];
      if (round) {
        rounds.push(round);
      }
    }

    return rounds;
  }

  get treatment(): { [key: string]: any } {
    return (this.get("treatment") as { [key: string]: any }) || {};
  }
}

export class Round extends EScope {
  public stages: Stage[] = [];

  constructor(public store: Store) {
    super(store);
  }

  get game() {
    const gameID = this.get("gameID") as string | undefined;
    return gameID && this.store.games[gameID];
  }
}

export class Stage extends EScope {
  remaining: number | null = null;
  remainingW: Writable<number | null> = writable(null);
  timeoutID?: ReturnType<typeof setTimeout>;
  ended: boolean = false;
  public state?: State;

  constructor(public store: Store) {
    super(store);
  }

  get round() {
    const roundID = this.get("roundID") as string | undefined;
    return roundID && this.store.rounds[roundID];
  }

  get duration(): number {
    return this.get("duration") as number;
  }

  clearTimer() {
    this.clearTimout();
    this.remainingW.set(0);
    this.remaining = 0;
    this.ended = true;
  }

  clearTimout() {
    if (this.timeoutID) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
  }

  setTimer(from: Date, remaining: number) {
    this.updateTime(from, remaining);
    this.nextTimer(from, remaining);
  }

  nextTimer(from: Date, remaining: number) {
    this.clearTimout();

    const ellapsed = new Date().valueOf() - from.valueOf();
    let rem = remaining * 1000 - ellapsed;

    // console.log("ellapsed", ellapsed);
    // console.log("rem", rem);

    if (rem < 0) {
      return;
    }

    const remmod = rem % 1000;
    // console.log("remmod", remmod);

    let wait = 1000;
    if (remmod > 0) {
      wait = remmod;
    }

    // rem -= wait;

    // console.log("rem2", rem);
    // console.log("wait", wait);

    this.timeoutID = setTimeout(() => {
      this.nextTimer(from, remaining);
      this.updateTime(from, remaining);
    }, wait);
  }

  private updateTime(from: Date, remaining: number) {
    const ellapsed = new Date().valueOf() - from.valueOf();
    let rem = remaining * 1000 - ellapsed;
    const val = Math.round(rem / 1000);
    if (val < 0) {
      return;
    }
    const r = Math.abs(val);
    this.remainingW.set(r);
    this.remaining = r;
  }
}

export class Store {
  public scopes: { [key: string]: EScope } = {};
  public batches: { [key: string]: Batch } = {};
  public games: { [key: string]: Game } = {};
  public rounds: { [key: string]: Round } = {};
  public stages: { [key: string]: Stage } = {};
  public players: { [key: string]: Player } = {};
  public root?: Root;
  public pushAttributeChange?: (attribute: EAttribute) => void;

  attributeChanged(attribute: EAttribute) {
    if (!this.pushAttributeChange) {
      console.warn("store: pushAttributeChange missing");
      return;
    }

    this.pushAttributeChange(attribute);
  }

  updateParticipant(p: ParticipantChange, removed: boolean) {
    if (removed) {
      delete this.players[p.id];
      return;
    }

    let player = this.players[p.id];
    if (!player) {
      player = new Player(this);
      this.players[p.id] = player;
    }
    player.participant = p;

    return player;
  }

  updateAttribute(a: AttributeChange, removed: boolean) {
    const scope = this.scopes[a.nodeID];
    if (!scope) {
      console.warn("scopes: got attribute without scope");
      return;
    }

    if (removed) {
      return scope.removeAttribute(a);
    }

    return scope.updateAttribute(a);
  }

  updateScope(s: ScopeChange, removed: boolean) {
    if (removed) {
      switch (s.kind) {
        case "player":
          const player = this.scopes[s.id];
          delete this.players[player.id];
          break;
        case "batch":
          delete this.batches[s.id];
          break;
        case "game":
          delete this.games[s.id];
          break;
        case "round":
          delete this.rounds[s.id];
          break;
        case "stage":
          delete this.stages[s.id];
          break;
        default:
          break;
      }

      delete this.scopes[s.id];

      return;
    }

    let scope = this.scopes[s.id];
    if (scope) {
      return scope;
    }

    switch (s.kind) {
      case "root":
        if (this.root?.scope) {
          console.error("scopes: second root created");
          return;
        }

        const root = new Root(this);
        root.scope = scope;
        this.root = root;
        break;
      case "player": {
        const p = this.players[s.name!];
        if (p) {
          p.scope = s;
          scope = p;
        } else {
          const player = new Player(this);
          this.players[s.name!] = player;
          scope = player;
        }

        break;
      }
      case "batch": {
        const batch = new Batch(this);
        this.batches[s.id] = batch;
        scope = batch;

        break;
      }
      case "game": {
        const game = new Game(this);
        this.games[s.id] = game;
        scope = game;

        break;
      }
      case "round": {
        const round = new Round(this);
        this.rounds[s.id] = round;
        scope = round;

        break;
      }
      case "stage": {
        const stage = new Stage(this);
        this.stages[s.id] = stage;
        scope = stage;

        break;
      }
      default: {
        console.warn("scopes: unknown scope kind", s);

        return;
      }
    }

    scope.scope = s;
    this.scopes[s.id] = scope;

    return scope;
  }
}
