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
  /** createdAt is the time the Attribute was created. int64 Date + Time
   * value given in Epoch with ns precision */
  createdAt?: string;
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
    donesObs: Observable<string[]>,
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<unknown>
  ) {
    attributesObs.subscribe({
      next: ({ attribute, removed }) => {
        this.update(attribute, removed);
      },
    });

    donesObs.subscribe({
      next: (scopeIDs) => {
        this.next(scopeIDs);
      },
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
      let key = attr.key;
      if (attr.index !== undefined && attr.index !== null) {
        key = `${key}[${attr.index}]`;
      }
      scopeMap.set(key, attr);
    }
  }

  scopeWasUpdated(scopeID?: string): boolean {
    if (!scopeID) {
      return false;
    }

    return this.updates.has(scopeID);
  }

  protected next(scopeIDs: string[]) {
    for (const [scopeID, attrs] of this.updates) {
      if (!scopeIDs.includes(scopeID)) {
        continue;
      }

      let scopeMap = this.attrs.get(scopeID);

      if (!scopeMap) {
        scopeMap = new Map();
        this.attrs.set(scopeID, scopeMap);
      }

      for (const [key, attrOrDel] of attrs) {
        if (typeof attrOrDel === "boolean") {
          let attr = scopeMap.get(key);
          if (attr) {
            attr._update(undefined);
          }
        } else {
          let attr = scopeMap.get(attrOrDel.key);
          if (!attr) {
            attr = new Attribute(this.setAttributes, scopeID, attrOrDel.key);
            scopeMap.set(attrOrDel.key, attr);
          }

          attr._update(attrOrDel);
        }
      }
    }

    for (const scopeID of scopeIDs) {
      this.updates.delete(scopeID);
    }
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
  private attrs?: Attribute[];

  private val = new BehaviorSubject<JsonValue | undefined>(undefined);

  constructor(
    private setAttributes: (input: SetAttributeInput[]) => Promise<unknown>,
    readonly scopeID: string,
    readonly key: string
  ) {}

  get id() {
    return this.attr?.id;
  }

  get createdAt() {
    return this.attr ? new Date(this.attr!.createdAt!) : null;
  }

  get obs(): Observable<JsonValue | undefined> {
    return this.val;
  }

  get value() {
    return this.val.getValue();
  }

  get nodeID() {
    return this.scopeID;
  }

  // items returns the attribute changes for the current attribute, if it is a
  // vector. Otherwise it returns null;
  get items() {
    if (!this.attrs) {
      return null;
    }

    return this.attrs;
  }

  set(value: JsonValue, ao?: Partial<AttributeOptions>) {
    const attrProps = this._prepSet(value, ao);
    this.setAttributes([attrProps]);
    trace(`SET ${this.key} = ${value} (${this.scopeID})`);
  }

  _prepSet(
    value: JsonValue,
    ao?: Partial<AttributeOptions>,
    item?: boolean
  ): SetAttributeInput {
    if (!item && ao?.append && ao!.index === undefined) {
      ao!.index = this.attrs?.length || 0;
    }

    if (!item && ao?.index !== undefined) {
      const index = ao!.index!;

      if (!this.attrs) {
        this.attrs = [];
      }

      if (index + 1 > (this.attrs?.length || 0)) {
        this.attrs.length = index! + 1;
      }

      if (!this.attrs[index]) {
        this.attrs[index] = new Attribute(
          this.setAttributes,
          this.scopeID,
          this.key
        );
      }

      this.attrs![index]!._prepSet(value, ao, true);
      const v = this._recalcVectorVal();
      this.val.next(v);
    } else {
      this.val.next(value);
    }

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
      attrProps.index = ao.index;
    }

    return attrProps;
  }

  private _recalcVectorVal(): JsonValue {
    return this.attrs!.map((a) =>
      !a || a.val == undefined ? null : a.value || null
    );
  }

  // internal only
  _update(attr?: AttributeChange, item?: boolean) {
    if (attr && this.attr && this.attr.id === attr.id) {
      return;
    }

    if (attr && attr.vector && !item) {
      // TODO check if is vector

      if (attr.index === undefined) {
        error(`vector attribute missing index`);
        return;
      }

      if (this.attrs == undefined) {
        this.attrs = [];
      }

      while (this.attrs.length < attr.index! + 1) {
        const newAttr = new Attribute(
          this.setAttributes,
          this.scopeID,
          this.key
        );
        this.attrs.push(newAttr);
      }

      const newAttr = new Attribute(this.setAttributes, this.scopeID, this.key);
      newAttr._update(attr, true);
      this.attrs[attr.index!] = newAttr;
      const value = this._recalcVectorVal();
      this.val.next(value);

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
