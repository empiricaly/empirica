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
    | "updateAttribute"
    | "start"
    | "cancel"
    | "pause"
    | "end";
  attr?: EAttribute;
  scope?: EScope;
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
  public scope?: EScope;
  public state?: State;

  constructor(public store: Store, public step: Step) {}

  addTransition(t: Transition) {
    this.transitions.push(t);
    this.state = t.to;
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
    if (!this.scope) {
      throw "scope not created yet";
    }

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
    this.store.pushChange({
      type: "updateAttribute",
      attr: a,
    });
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
}

export class Player extends EScope {
  public games: Game[] = [];
  public currentGame?: Game;
  public online: boolean = false;

  constructor(public store: Store, public participant: Participant) {
    super(store);
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

export class Root extends EScope {
  public batches: Batch[] = [];

  addBatch(attrs?: Json): Batch {
    const batch = new Batch(this.store, this);
    this.batches.push(batch);
    this.store.pushChange({
      type: "newScope",
      scope: batch,
    });

    if (attrs) {
      for (const key in attrs) {
        batch.set(key, attrs[key]);
      }
    }

    return batch;
  }
}

export class Batch extends EScope {
  public games: Game[] = [];

  constructor(public store: Store, public root: Root) {
    super(store);
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
    const batchIDs: string[] = this.root.get("batchIDs") as string[] | [];
    batchIDs.push(this.id);
    this.root.set("batchIDs", batchIDs, { protected: true });
    this.set("rootID", this.root.id);
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
        throw "player already assigned";
      } else {
        console.warn("reassigning player to same game");
        return;
      }
    }

    player.games.push(this);
    player.currentGame = this;

    this.players.push(player);
    this.store.pushChange({
      type: "newAssignment",
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

  end() {
    this.store.pushChange({
      type: "end",
      scope: this,
    });
  }

  postProcess() {
    const gameIDs: string[] = this.batch.get("gameIDs") as string[] | [];
    gameIDs.push(this.id);
    this.batch.set("gameIDs", gameIDs, { protected: true });
    this.set("batchID", this.batch.id);
  }
}

export class Round extends EScope {
  public stages: Stage[] = [];

  constructor(public store: Store, public game: Game) {
    super(store);
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
    const roundIDs: string[] = this.game.get("roundIDs") as string[] | [];
    roundIDs.push(this.id);
    this.game.set("roundIDs", roundIDs, { protected: true });
    this.set("gameID", this.game.id);
  }
}

export class Stage extends EScope {
  public step?: EStep;

  constructor(public store: Store, public round: Round) {
    super(store);
  }

  get duration(): number {
    return this.get("duration") as number;
  }

  end() {
    this.store.pushChange({
      type: "end",
      scope: this,
    });
  }

  postProcess() {
    const stageIDs: string[] = this.round.get("stageIDs") as string[] | [];
    stageIDs.push(this.id);
    this.round.set("stageIDs", stageIDs, { protected: true });
    this.set("roundID", this.round.id);
  }
}

export class Store {
  public steps: { [key: string]: EStep } = {};
  public scopes: { [key: string]: EScope } = {};
  public batches: { [key: string]: Batch } = {};
  public games: { [key: string]: Game } = {};
  public rounds: { [key: string]: Round } = {};
  public stages: { [key: string]: Stage } = {};
  public players: { [key: string]: Player } = {};
  private changes: Change[] = [];

  constructor(public root: Root) {}

  pushChange(change: Change) {
    this.changes.push(change);
  }

  popChanges(): Change[] {
    const changes = this.changes;
    this.changes = [];
    return changes;
  }

  addStep(s: Step) {
    let step = this.steps[s.id];
    if (!step) {
      step = new EStep(this, step);
      this.steps[s.id] = step;
      for (const id in this.stages) {
        const stage = this.stages[id];
        const stepID = stage.get("stepID");
        if (stepID === s.id) {
          stage.step = step;
          break;
        }
      }

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
      player = new Player(this, player);
      this.players[p.id] = player;
      for (const id in this.games) {
        const game = this.games[id];
        const playerIDs = (game.get("playerIDs") as string[]) || [];
        if (playerIDs.includes(p.id)) {
          game.players.push(player);
        }
      }
    }

    return player;
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
      console.warn("scopes: got attribute without scope");
      return;
    }

    return scope.updateAttribute(a);
  }

  addScope(s: Scope) {
    let scope = this.scopes[s.id];
    if (scope) {
      return scope;
    }

    switch (s.kind) {
      case "root":
        if (this.root.scope) {
          console.error("scopes: second root created");
          return;
        }

        const root = new Root(this);
        root.scope = scope;
        this.root = root;
      case "batch": {
        const batch = new Batch(this, this.root);
        this.batches[s.id] = batch;
        scope = batch;

        break;
      }
      case "game": {
        const batchAttr = s.attributes?.edges?.find(
          (a) => a?.node?.key === "batchID"
        );
        if (!batchAttr) {
          console.error("scopes: game is missing batchID");
          return;
        }
        if (!batchAttr.node?.val) {
          console.error("scopes: game attr is missing batchID");
          return;
        }

        const batchID = JSON.parse(batchAttr.node!.val);
        const batch = this.batches[batchID];
        if (!batch) {
          console.error("scopes: game is missing batch");
          return;
        }

        const game = new Game(this, batch);
        this.games[s.id] = game;
        scope = game;

        break;
      }
      case "round": {
        const gameAttr = s.attributes?.edges?.find(
          (a) => a?.node?.key === "gameID"
        );
        if (!gameAttr) {
          console.error("scopes: game is missing gameID");
          return;
        }
        if (!gameAttr.node?.val) {
          console.error("scopes: game attr is missing gameID");
          return;
        }

        const gameID = JSON.parse(gameAttr.node!.val);
        const game = this.games[gameID];
        if (!game) {
          console.error("scopes: game is missing game");
          return;
        }

        const round = new Round(this, game);
        this.rounds[s.id] = round;
        scope = round;

        break;
      }
      case "stage": {
        const roundAttr = s.attributes.edges.find(
          (a) => a.node.key === "roundID"
        );
        if (!roundAttr) {
          console.error("scopes: round is missing roundID");
          return;
        }
        if (!roundAttr.node.val) {
          console.error("scopes: round attr is missing roundID");
          return;
        }

        const roundID = JSON.parse(roundAttr.node.val);
        const round = this.rounds[roundID];
        if (!round) {
          console.error("scopes: round is missing round");
          return;
        }

        const stage = new Stage(this, round);
        this.stages[s.id] = stage;
        scope = stage;

        break;
      }
      default: {
        console.warn("scopes: unknown scope kind", s.kind);

        return;
      }
    }

    scope.scope = s;
    this.scopes[s.id] = scope;

    for (const edge of s.attributes.edges) {
      scope.updateAttribute(edge.node);
    }

    return scope;
  }
}
