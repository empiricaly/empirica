import { SetAttributeInput } from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { error, trace } from "../utils/console";
import { JsonValue } from "../utils/json";

export interface AttributeChange {
  /** deleted is true with the attribute was deleted. */
  deleted?: boolean;
  /** deletedAt is the time when the Attribute was deleted. int64 Date + Time
   * value given in Epoch with ns precision */
  deletedAt?: number;
  /** id is the identifier for the Attribute. */
  id: string;
  /** index is the index of the attribute if the value is a vector. */
  index?: number | null;
  /** isNew is true if the Attribute was just created. */
  isNew?: boolean;
  /** key is the attribute key being updated. */
  key: string;
  /** nodeID is the identifier for the Attribute's Node. */
  nodeID?: string;
  /** node is the Attribute's Node. */
  node?: {
    __typename: "Scope";
    id: string;
    kind?: string;
    name?: string;
  };
  /** value is the value of the updated attribute. */
  val?: string | null;
  /** vector indicates whether the value is a vector. */
  vector: boolean;
  /** version is the version number of this Attribute, starting at 1. */
  version: number;
}

export interface AttributeUpdate {
  attribute: AttributeChange;
  removed: boolean;
}

export class Attributes {
  protected attrs = new Map<string, Map<string, Attribute>>();
  protected updates = new Map<string, Map<string, AttributeChange | boolean>>();

  constructor(
    attributesObs: Observable<AttributeUpdate>,
    donesObs: Observable<void>,
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<unknown>
  ) {
    attributesObs.subscribe({
      next: ({ attribute, removed }) => {
        this.update(attribute, removed);
      },
    });

    donesObs.subscribe({
      next: this.next.bind(this),
    });
  }

  attribute(scopeID: string, key: string): Attribute {
    let scopeMap = this.attrs.get(scopeID);
    if (!scopeMap) {
      scopeMap = new Map();
      this.attrs.set(scopeID, scopeMap);
    }

    let attr = scopeMap.get(key);
    if (!attr) {
      attr = new Attribute(this.setAttributes, scopeID, key);
      scopeMap.set(key, attr);
    }

    return attr;
  }

  attributes(scopeID: string): Attribute[] {
    let scopeMap = this.attrs.get(scopeID);
    if (!scopeMap) {
      scopeMap = new Map();
      this.attrs.set(scopeID, scopeMap);
    }

    return Array.from(scopeMap.values());
  }

  attributePeek(scopeID: string, key: string): Attribute | undefined {
    let scopeUpdateMap = this.updates.get(scopeID);
    if (scopeUpdateMap) {
      const updated = scopeUpdateMap.get(key);
      if (updated) {
        if (typeof updated === "boolean") {
          return;
        } else {
          if (!updated.val) {
            return;
          } else {
            const attr = new Attribute(this.setAttributes, scopeID, key);
            attr._update(updated);
            return attr;
          }
        }
      }
    }

    let scopeMap = this.attrs.get(scopeID);
    if (!scopeMap) {
      return;
    }

    let attr = scopeMap.get(key);
    if (!attr) {
      return;
    }

    if (attr.value === undefined) {
      return;
    }

    return attr;
  }

  nextAttributeValue(scopeID: string, key: string): JsonValue | undefined {
    const attr = this.attributePeek(scopeID, key);
    if (!attr) {
      return;
    }

    return attr.value;
  }

  private update(attr: AttributeChange, removed: boolean) {
    let nodeID = attr.nodeID;
    if (!nodeID) {
      if (!attr.node?.id) {
        error(`new attribute without node ID`);
        return;
      }
      nodeID = attr.node.id;
    }

    let scopeMap = this.updates.get(nodeID);
    if (!scopeMap) {
      scopeMap = new Map();
      this.updates.set(nodeID, scopeMap);
    }

    if (removed) {
      scopeMap.set(attr.key, true);
    } else {
      scopeMap.set(attr.key, attr);
    }
  }

  scopeWasUpdated(scopeID?: string): boolean {
    if (!scopeID) {
      return false;
    }

    return this.updates.has(scopeID);
  }

  protected next() {
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
            attr._update(undefined);
          }
        } else {
          if (!attr) {
            attr = new Attribute(this.setAttributes, scopeID, key);
            scopeMap.set(key, attr);
          }

          attr._update(attrOrDel);
        }
      }
    }

    this.updates.clear();
  }
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

export class Attribute {
  private attr?: AttributeChange;
  private val = new BehaviorSubject<JsonValue | undefined>(undefined);

  constructor(
    private setAttributes: (input: SetAttributeInput[]) => Promise<unknown>,
    readonly scopeID: string,
    readonly key: string
  ) {}

  get id() {
    return this.attr?.id;
  }

  get obs(): Observable<JsonValue | undefined> {
    return this.val;
  }

  get value() {
    return this.val.getValue();
  }

  get nodeID() {
    return this.attr?.nodeID || this.attr?.node?.id;
  }

  set(value: JsonValue, ao?: Partial<AttributeOptions>) {
    this.val.next(value);

    const attrProps: SetAttributeInput = {
      key: this.key,
      nodeID: this.scopeID,
      val: JSON.stringify(value),
    };

    if (ao) {
      // TODO Fix this. Should check if compatible with existing attribute and
      // only set fields set on ao.
      attrProps.private = ao.private;
      attrProps.protected = ao.protected;
      attrProps.immutable = ao.immutable;
      attrProps.append = ao.append;
      attrProps.vector = ao.vector;
      attrProps.index = ao.index;
    }

    this.setAttributes([attrProps]);
    trace(`SET ${this.key} = ${value} (${this.scopeID})`);
  }

  // internal only
  _update(attr?: AttributeChange) {
    if (attr && this.attr && this.attr.id === attr.id) {
      return;
    }

    this.attr = attr;
    let value: JsonValue | undefined = undefined;
    if (this.attr?.val) {
      value = JSON.parse(this.attr.val);
    }
    this.val.next(value);
  }
}
