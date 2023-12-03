import {
  InputMaybe,
  ScopedAttributesInput,
  ScopesQueryVariables,
  Tajriba,
  TajribaAdmin,
} from "@empirica/tajriba";
import { Constructor } from "../../../shared/helpers";
import { JsonValue } from "../../../utils/json";

export class Scope {
  private _attributes = new Map<string, Attribute>();
  constructor(protected conn: Conn, private edge: ScopeEdge) {
    for (const edge of this.edge.attributes.edges) {
      this._attributes.set(edge.node.key, new Attribute(edge.node));
    }
  }

  get id() {
    return this.edge.id;
  }

  get attributes() {
    return Array.from(this._attributes.values()).filter(
      (a) =>
        !a.key.startsWith("ran-") &&
        !a.key.startsWith("playerGameID") &&
        !a.key.startsWith("playerRoundID") &&
        !a.key.startsWith("playerStageID")
    );
  }

  allAttributes() {
    return this._attributes;
  }
}

export class Attribute {
  private _value?: JsonValue;
  constructor(private edge: AttributeEdge) {
    if (edge.val) {
      this._value = JSON.parse(edge.val);
    }
  }

  get createdAt() {
    return this.edge.createdAt;
  }

  get id() {
    return this.edge.id;
  }

  get key() {
    return this.edge.key;
  }

  get value() {
    return this._value;
  }
}

export class Player extends Scope {}
export class Batch extends Scope {}
export class Game extends Scope {}
export class PlayerGame extends Scope {}
export class Round extends Scope {}
export class PlayerRound extends Scope {}
export class Stage extends Scope {}
export class PlayerStage extends Scope {}

export class Conn {
  constructor(private tajriba: TajribaAdmin) {}

  stop() {
    this.tajriba.stop();
  }

  players() {
    return this.scopesByKind<Player>("player", Player);
  }

  batches() {
    return this.scopesByKind<Batch>("batch", Batch);
  }

  games() {
    return this.scopesByKind<Game>("game", Game);
  }

  rounds() {
    return this.scopesByKind<Round>("round", Round);
  }

  stages() {
    return this.scopesByKind<Stage>("stage", Stage);
  }

  playerGames() {
    return this.scopesByKind<PlayerGame>("playerGame", PlayerGame);
  }

  playerRounds() {
    return this.scopesByKind<PlayerRound>("playerRound", PlayerRound);
  }

  playerStages() {
    return this.scopesByKind<PlayerStage>("playerStage", PlayerStage);
  }

  private scopesByKind<T extends Scope>(
    kind: string,
    cnstrctr: Constructor<T>
  ) {
    return this.filteredScopes({ kinds: [kind] }, cnstrctr);
  }

  private async *filteredScopes<T extends Scope>(
    filter: InputMaybe<Array<ScopedAttributesInput> | ScopedAttributesInput>,
    cnstrctr: Constructor<T>
  ) {
    const args: ScopesQueryVariables = {
      first: 100,
      filter,
    };

    while (true) {
      const scopes = await this.tajriba.scopes(args);
      for (const edge of scopes?.edges ?? []) {
        yield new cnstrctr(this, edge.node);
      }

      if (!scopes?.pageInfo.hasNextPage) {
        break;
      } else {
        args.after = scopes.pageInfo.endCursor;
      }
    }
  }
}

export async function connect(
  tajURL: string,
  token: string | null,
  srtoken: string,
  clientName: string = "api"
): Promise<Conn> {
  const tajriba = await Tajriba.createAndAwait(tajURL);
  tajriba.useHTTP = true;

  if (!token) {
    token = await tajriba.registerService(clientName, srtoken);
  }

  return new Conn(await tajriba.sessionAdmin(token));
}

interface AttributeEdge {
  __typename: "Attribute";
  id: string;
  createdAt: any;
  private: boolean;
  protected: boolean;
  immutable: boolean;
  deletedAt?: any;
  key: string;
  val?: string | null | undefined;
  index?: number | null | undefined;
  current: boolean;
  version: number;
  vector: boolean;
  createdBy:
    | {
        __typename: "Participant";
        id: string;
        identifier: string;
        createdAt: any;
      }
    | {
        __typename: "Service";
        id: string;
        name: string;
        createdAt: any;
      }
    | {
        __typename: "User";
        id: string;
        username: string;
        name: string;
        createdAt: any;
      };
  node:
    | {
        __typename: "Attribute";
        id: string;
      }
    | {
        __typename: "Group";
        id: string;
      }
    | {
        __typename: "Link";
        id: string;
      }
    | {
        __typename: "Participant";
        id: string;
      }
    | {
        __typename: "Scope";
        kind?: string | null | undefined;
        name?: string | null | undefined;
        id: string;
      }
    | {
        __typename: "Step";
        id: string;
      }
    | {
        __typename: "Transition";
        id: string;
      }
    | {
        __typename: "User";
        id: string;
      };
}

interface ScopeEdge {
  id: string;
  name?: string | null | undefined;
  kind?: string | null | undefined;
  createdBy:
    | {
        __typename: "Participant";
        id: string;
        identifier: string;
        createdAt: any;
      }
    | {
        __typename: "Service";
        id: string;
        name: string;
        createdAt: any;
      }
    | {
        __typename: "User";
        id: string;
        username: string;
        name: string;
        createdAt: any;
      };
  attributes: {
    __typename: "AttributeConnection";
    totalCount: number;
    pageInfo: {
      __typename: "PageInfo";
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: any;
      endCursor?: any;
    };
    edges: {
      __typename: "AttributeEdge";
      cursor: any;
      node: AttributeEdge;
    }[];
  };
}
