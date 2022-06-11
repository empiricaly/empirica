import {
  Attribute,
  Group,
  Participant,
  Scope,
  State,
  Step,
  Transition,
} from "@empirica/tajriba";
import { Json, JsonValue } from "./json";

export interface Change {
  type:
    | "newScope"
    | "newAssignment"
    | "newUnassignment"
    | "updateAttribute"
    | "start"
    | "cancel"
    | "pause"
    | "end"
    | "terminate"
    | "fail";
  cause?: string;
  attr?: EAttribute;
  isNew?: boolean;
  scope?: EScope;
  attrs?: Json;
  player?: Player;
}

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
    public attribute?: Attribute
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

  update(attribute: Attribute) {
    this.attribute = attribute;

    if (attribute.val) {
      this.value = JSON.parse(attribute.val);
    }

    this.ao = {
      private: attribute.private,
      protected: attribute.protected,
      immutable: attribute.immutable,
      vector: attribute.vector,
      index: attribute.index,
    };
  }
}

export class EStep {
  public transitions: Transition[] = [];
  private _scope?: EScope;
  public state?: State;

  constructor(public store: Store, public step: Step) {}

  get scope() {
    if (!this._scope) {
      for (const id in this.store.scopes) {
        const scope = this.store.scopes[id];
        const stepID = scope.get("stepID");
        if (stepID === this.step.id) {
          this._scope = scope;
          break;
        }
      }
    }

    return this._scope;
  }

  addTransition(t: Transition) {
    this.transitions.push(t);
    this.state = t.to;
  }
}

export interface getSetter {
  get: (key: string) => JsonValue;
  set: (key: string, val: JsonValue, ao?: Partial<AttributeOptions>) => void;
}

export function scopedScope(
  scope: EScope,
  subType: string,
  subID: string
): getSetter {
  const prefix = `##${scope.type}-${subType}:${subID}::`;
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
  public scope?: Scope;

  constructor(public store: Store) {}

  get id() {
    if (!this.scope) {
      throw "scope not created yet";
    }

    return this.scope.id;
  }

  get type() {
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
    const isNew = !Boolean(this.attributes[key]);
    this.attributes[key] = a;
    this.store.pushChange({
      type: "updateAttribute",
      attr: a,
      isNew,
    });

    if (this instanceof Batch) {
      this.store.subUpdates("batches");
    }
  }

  updateAttribute(attribute: Attribute) {
    if (this.attributes[attribute.key]) {
      this.attributes[attribute.key].update(attribute);
    } else {
      const a = new EAttribute(this, attribute.key);
      a.update(attribute);
      this.attributes[attribute.key] = a;
    }

    return this.attributes[attribute.key];
  }

  postProcess() {}
  creationAttributes(): Attribute[] {
    return [];
  }
}

export class Player extends EScope {
  public currentGame?: Game;
  public online: boolean = false;

  constructor(public store: Store, public participant: Participant) {
    super(store);
  }

  get id() {
    return this.participant.id;
  }

  get type() {
    return "player";
  }

  get game() {
    if (!this.currentGame) {
      throw new Error("player.game outside of game context");
    }

    return scopedScope(this, "game", this.currentGame.id);
  }

  get round() {
    if (!this.currentGame || !this.currentGame.currentStage) {
      throw new Error("player.round outside of round context");
    }

    return scopedScope(this, "round", this.currentGame.currentStage.round.id);
  }

  get stage() {
    if (!this.currentGame || !this.currentGame.currentStage) {
      throw new Error("player.stage outside of stage context");
    }

    return scopedScope(this, "stage", this.currentGame.currentStage.id);
  }
}

export class Global extends EScope {
  get type() {
    return "global";
  }
}

export class Root extends EScope {
  public batches: Batch[] = [];

  get type() {
    return "root";
  }

  addBatch(attrs?: Json): Batch {
    const batch = new Batch(this.store, this);
    this.batches.push(batch);
    this.store.pushChange({
      type: "newScope",
      scope: batch,
      attrs,
    });

    return batch;
  }
}

export class Batch extends EScope {
  public games: Game[] = [];

  constructor(public store: Store, public root: Root) {
    super(store);
  }

  get type() {
    return "batch";
  }

  get config(): { [key: string]: any } {
    return (this.get("treatment") as { [key: string]: any }) || {};
  }

  addGame(attrs: Json): Game {
    const game = new Game(this.store, this);
    this.games.push(game);
    this.store.pushChange({
      type: "newScope",
      scope: game,
    });

    if (attrs) {
      for (const key in attrs) {
        game.set(key, attrs[key]);
      }
    }

    return game;
  }

  postProcess() {
    const batchIDs: string[] = (this.root.get("batchIDs") as string[]) || [];
    batchIDs.push(this.id);
    this.root.set("batchIDs", batchIDs, { protected: true });
  }

  creationAttributes() {
    return [
      <Attribute>{
        key: "rootID",
        val: JSON.stringify(this.root.id),
        // immutable: true,
      },
    ];
  }
}

export class Game extends EScope {
  public players: Player[] = [];
  public rounds: Round[] = [];
  public group?: Group;
  public currentStage?: Stage;

  constructor(public store: Store, public batch: Batch) {
    super(store);
  }

  get type() {
    return "game";
  }

  get treatment(): { [key: string]: any } {
    return (this.get("treatment") as { [key: string]: any }) || {};
  }

  addRound(attrs?: Json): Round {
    const round = new Round(this.store, this);
    this.rounds.push(round);
    this.store.pushChange({
      type: "newScope",
      scope: round,
    });

    if (attrs) {
      for (const key in attrs) {
        round.set(key, attrs[key]);
      }
    }

    return round;
  }

  assign(player: Player) {
    if (player.currentGame) {
      if (player.currentGame !== this) {
        throw new Error("player already assigned");
      } else {
        console.warn("reassigning player to same game");
        return;
      }
    }

    player.currentGame = this;

    this.players.push(player);
    this.store.pushChange({
      type: "newAssignment",
      player: player,
    });
  }

  unassign(player: Player) {
    if (!player.currentGame) {
      throw new Error("player not assigned");
    }

    this.players = this.players.filter((p) => p !== player);
    this.store.pushChange({
      type: "newUnassignment",
      player: player,
    });
  }

  start() {
    this.store.pushChange({
      type: "start",
      scope: this,
    });
  }

  cancel() {
    this.store.pushChange({
      type: "cancel",
      scope: this,
    });
  }

  pause() {
    this.store.pushChange({
      type: "pause",
      scope: this,
    });
  }

  end(reason: string) {
    this.store.pushChange({
      type: "end",
      scope: this,
      cause: reason,
    });
  }

  terminate(reason: string) {
    this.store.pushChange({
      type: "terminate",
      scope: this,
      cause: reason,
    });
  }

  fail(reason: string) {
    this.store.pushChange({
      type: "fail",
      scope: this,
      cause: reason,
    });
  }

  postProcess() {
    const gameIDs: string[] = (this.batch.get("gameIDs") as string[]) || [];
    gameIDs.push(this.id);
    this.batch.set("gameIDs", gameIDs, { protected: true });
  }

  creationAttributes() {
    return [
      <Attribute>{
        key: "batchID",
        val: JSON.stringify(this.batch.id),
        // immutable: true,
      },
    ];
  }
}

export class Round extends EScope {
  public stages: Stage[] = [];

  constructor(public store: Store, public game: Game) {
    super(store);
  }

  get type() {
    return "round";
  }

  addStage(attrs: Json): Stage {
    const duration = attrs["duration"];
    if (!duration) {
      throw new Error("stage: addStage requires duration option");
    }

    if (typeof duration !== "number") {
      throw new Error(
        "stage: addStage's duration option should be a number of seconds"
      );
    }

    if (duration < 5) {
      throw new Error("stage: addStage's duration option should > 5 seconds");
    }

    const stage = new Stage(this.store, this);
    this.stages.push(stage);
    this.store.pushChange({
      type: "newScope",
      scope: stage,
    });

    if (attrs) {
      for (const key in attrs) {
        stage.set(key, attrs[key]);
      }
    }

    return stage;
  }

  postProcess() {
    const roundIDs: string[] = (this.game.get("roundIDs") as string[]) || [];
    roundIDs.push(this.id);
    this.game.set("roundIDs", roundIDs, { protected: true });
  }

  creationAttributes() {
    return [
      <Attribute>{
        key: "gameID",
        val: JSON.stringify(this.game.id),
        // immutable: true,
      },
    ];
  }
}

export class Stage extends EScope {
  constructor(public store: Store, public round: Round) {
    super(store);
  }

  get type() {
    return "stage";
  }

  get duration(): number {
    return this.get("duration") as number;
  }

  get step(): EStep | undefined {
    return this.store.steps[this.get("stepID") as string];
  }

  end() {
    this.store.pushChange({
      type: "end",
      scope: this,
    });
  }

  postProcess() {
    const stageIDs: string[] = (this.round.get("stageIDs") as string[]) || [];
    stageIDs.push(this.id);
    this.round.set("stageIDs", stageIDs, { protected: true });
  }

  creationAttributes() {
    return [
      <Attribute>{
        key: "roundID",
        val: JSON.stringify(this.round.id),
        // immutable: true,
      },
    ];
  }
}

export type changeCallback = (change: any) => {};

export class Store {
  public root: Root = <Root>{};
  public global: Global = <Global>{};
  public steps: { [key: string]: EStep } = {};
  public scopes: { [key: string]: EScope } = {};
  public batches: { [key: string]: Batch } = {};
  public games: { [key: string]: Game } = {};
  public rounds: { [key: string]: Round } = {};
  public stages: { [key: string]: Stage } = {};
  public players: { [key: string]: Player } = {};
  private changes: Change[] = [];
  private subs: { [key: string]: changeCallback[] } = {};

  sub(kind: string, cb: changeCallback) {
    if (!this.subs[kind]) {
      this.subs[kind] = [];
    }
    this.subs[kind].push(cb);

    this.subUpdate(kind, cb);

    return () => {
      this.subs[kind] = this.subs[kind].filter((c) => c !== cb);
    };
  }

  subUpdates(kind: string) {
    for (const cb of this.subs[kind] || []) {
      this.subUpdate(kind, cb);
    }
  }

  private subUpdate(kind: string, cb: changeCallback) {
    switch (kind) {
      case "batches":
        cb(Object.values(this.batches));
        break;
    }
  }

  pushChange(change: Change) {
    this.changes.push(change);
  }

  hasChanges(): boolean {
    return this.changes.length > 0;
  }

  popChanges(): Change[] {
    const changes = this.changes;
    this.changes = [];
    return changes;
  }

  addStep(s: Step) {
    let step = this.steps[s.id];
    if (!step) {
      step = new EStep(this, s);
      this.steps[s.id] = step;

      for (const transition of s.transitions!.edges) {
        step.addTransition(transition.node);
      }
    }

    return step;
  }

  addTransition(t: Transition) {
    let step = this.steps[t.node.id];
    if (!step) {
      console.warn("steps: got transition without step");
      return;
    }

    step.addTransition(t);

    return step;
  }

  addParticipant(p: Participant) {
    let player = this.players[p.id];
    if (!player) {
      player = new Player(this, p);
      this.players[p.id] = player;
      this.addPlayerToGame(player);
    } else if (!player.participant.identifier) {
      player.participant = p;
    }

    return player;
  }

  private addPlayerToGame(player: Player) {
    for (const id in this.games) {
      const game = this.games[id];
      const playerIDs = (game.get("playerIDs") as string[]) || [];
      if (playerIDs.includes(player.id)) {
        game.players.push(player);
      }
    }
  }

  playerStatus(p: Player, online: boolean) {
    let player = this.players[p.id];
    if (!player) {
      throw "players: player status change missing";
    }

    player.online = online;
  }

  updateAttribute(a: Attribute) {
    const scope = this.scopes[a.node.id];
    if (!scope) {
      console.debug("scopes: got attribute without scope", a.node.id, a.key);
      return;
    }

    const attr = scope.updateAttribute(a);

    if (scope instanceof Batch) {
      this.subUpdates("batches");
    }

    return attr;
  }

  createEScope(s: Scope): EScope {
    let scope = this.scopes[s.id];
    if (scope) {
      return scope;
    }

    switch (s.kind) {
      case "global":
        const global = new Global(this);
        global.scope = s;
        return global;
      case "root":
        const root = new Root(this);
        root.scope = s;
        return root;
      case "player": {
        if (!s.name) {
          throw new Error("scopes: player scope without name");
        }

        const player = new Player(this, <Participant>{ id: s.name });
        player.scope = s;

        return player;
      }
      case "batch": {
        const batch = new Batch(this, this.root);
        batch.scope = s;
        return batch;
      }
      case "game": {
        const batchAttr = s.attributes?.edges?.find(
          (a) => a?.node?.key === "batchID"
        );
        if (!batchAttr) {
          throw new Error("scopes: game is missing batchID");
        }
        if (!batchAttr.node?.val) {
          throw new Error("scopes: game attr is missing batchID");
        }

        const batchID = JSON.parse(batchAttr.node!.val);
        const batch = this.batches[batchID];
        if (!batch) {
          throw new Error("scopes: game is missing batch");
        }

        const game = new Game(this, batch);
        game.scope = s;
        batch.games.push(game);

        return game;
      }
      case "round": {
        const gameAttr = s.attributes?.edges?.find(
          (a) => a?.node?.key === "gameID"
        );
        if (!gameAttr) {
          throw new Error("scopes: game is missing gameID");
        }
        if (!gameAttr.node?.val) {
          throw new Error("scopes: game attr is missing gameID");
        }

        const gameID = JSON.parse(gameAttr.node!.val);
        const game = this.games[gameID];
        if (!game) {
          throw new Error("scopes: game is missing game");
        }

        const round = new Round(this, game);
        round.scope = s;
        game.rounds.push(round);

        return round;
      }
      case "stage": {
        const roundAttr = s.attributes.edges.find(
          (a) => a.node.key === "roundID"
        );
        if (!roundAttr) {
          throw new Error("scopes: round is missing roundID");
        }
        if (!roundAttr.node.val) {
          throw new Error("scopes: round attr is missing roundID");
        }

        const roundID = JSON.parse(roundAttr.node.val);
        const round = this.rounds[roundID];
        if (!round) {
          throw new Error("scopes: round is missing round");
        }

        const stage = new Stage(this, round);
        stage.scope = s;
        round.stages.push(stage);

        return stage;
      }
      default: {
        throw new Error(`scopes: unknown scope kind ${s.kind}`);
      }
    }
  }

  addScope(s: Scope) {
    const sc = this.createEScope(s);
    this.saveEScope(sc);
    this.addAttributeEdges(s, sc);

    return sc;
  }

  saveEScope(s: EScope) {
    if (!s.scope) {
      throw new Error("cannot add scopeless escope");
    }

    let scope = this.scopes[s.scope.id];
    if (scope) {
      return scope;
    }

    switch (s.scope.kind) {
      case "global":
        if (this.global.scope) {
          throw new Error("scopes: second global created");
        }

        this.global = <Global>s;
        break;
      case "root":
        if (this.root.scope) {
          throw new Error("scopes: second root created");
        }

        this.root = <Root>s;
        break;
      case "player": {
        if (!s.scope.name) {
          throw new Error("scopes: player scope without name");
        }

        const player = this.players[s.scope.name];
        if (player) {
          player.scope = s.scope;
        } else {
          this.players[s.scope.name] = <Player>s;
          this.players[s.scope.id] = <Player>s;
          this.scopes[s.scope.name] = <Player>s;
          this.addPlayerToGame(<Player>s);
        }

        break;
      }
      case "batch": {
        this.batches[s.id] = <Batch>s;
        this.subUpdates("batches");

        break;
      }
      case "game": {
        this.games[s.id] = <Game>s;

        break;
      }
      case "round": {
        this.rounds[s.id] = <Round>s;

        break;
      }
      case "stage": {
        this.stages[s.id] = <Stage>s;

        break;
      }
      default: {
        throw new Error(`scopes: unknown scope kind: ${s.scope.kind}`);
      }
    }

    this.scopes[s.scope.id] = s;

    return scope;
  }

  addAttributeEdges(s: Scope, scope: EScope) {
    for (const edge of s.attributes.edges) {
      scope.updateAttribute(edge.node);
    }
  }
}
