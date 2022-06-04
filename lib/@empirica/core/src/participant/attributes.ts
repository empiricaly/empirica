import {
  AttributeChange as TAttribute,
  SetAttributeInput,
} from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { JsonValue } from "../utils/json";
import { AttributeChange } from "./provider";

export class Attributes {
  private attrs = new Map<string, Map<string, Attribute>>();
  private updates = new Map<string, Map<string, TAttribute | boolean>>();

  constructor(
    attributesObs: Observable<AttributeChange>,
    donesObs: Observable<void>,
    readonly setAttributes: (input: SetAttributeInput[]) => Promise<void>
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
      attr = new Attribute(this, scopeID, key);
      scopeMap.set(key, attr);
    }

    return attr;
  }

  private update(attr: TAttribute, removed: boolean) {
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

  scopeWasUpdated(scopeID?: string): boolean {
    if (!scopeID) {
      return false;
    }

    return this.updates.has(scopeID);
  }

  private next() {
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
  private attr: TAttribute | null = null;
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
  _update(attr: TAttribute | null) {
    this.attr = attr;
    let value: JsonValue = null;
    if (this.attr?.val) {
      value = JSON.parse(this.attr.val);
    }
    this.val.next(value);
  }
}
