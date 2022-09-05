import { Observable, ReplaySubject } from "rxjs";
import {
  Attribute,
  AttributeChange,
  Attributes as SharedAttributes,
} from "../shared/attributes";
import { warn } from "../utils/console";

export type AttributeMsg = {
  attribute?: Attribute;
  done: boolean;
};

export class Attributes extends SharedAttributes {
  protected attrsByKind = new Map<
    string,
    Map<string, Map<string, Attribute>>
  >();
  private attribSubs = new Map<
    string,
    Map<string, ReplaySubject<AttributeMsg>>
  >();

  subscribeAttribute(kind: string, key: string): Observable<AttributeMsg> {
    if (!this.attribSubs.has(kind)) {
      this.attribSubs.set(kind, new Map<string, ReplaySubject<AttributeMsg>>());
    }

    const keyMap = this.attribSubs.get(kind)!;
    let sub = keyMap.get(key);
    if (!sub) {
      sub = new ReplaySubject<AttributeMsg>();
      keyMap.set(key, sub);

      const attrByScopeID = this.attrsByKind.get(kind);

      setTimeout(() => {
        if (!attrByScopeID) {
          sub!.next({ done: true });
          return;
        }

        let attrs = [];
        for (const [_, attrByKey] of attrByScopeID?.entries()) {
          for (const [_, attr] of attrByKey) {
            attrs.push(attr);
          }
        }

        let count = 0;
        for (const attr of attrs) {
          count++;
          sub!.next({ attribute: attr, done: count == attrs.length });
        }
      }, 0);
    }

    return sub!;
  }

  protected next() {
    const byKind = new Map<string, AttributeChange[]>();

    for (const [_, attrs] of this.updates) {
      for (const [_, attr] of attrs) {
        if (typeof attr === "boolean") {
          continue;
        }

        const kind = attr.node?.kind;
        if (kind) {
          let kindAttrs = byKind.get(kind);
          if (!kindAttrs) {
            kindAttrs = [];
            byKind.set(kind, kindAttrs);
          }

          kindAttrs.push(attr);
        }
      }
    }

    const updates: [string, string, AttributeChange][] = [];
    for (const [kind, attrs] of byKind) {
      for (const attr of attrs) {
        // This is very difficult to reproduce in tests since this.updates
        // cannot contain an AttributeChange that would satisfy this.
        /* c8 ignore next 4 */
        if (!attr.nodeID && !attr.node?.id) {
          warn(`found attribute change without node ID`);
          continue;
        }
        updates.push([kind, attr.key, attr]);
      }
    }

    super.next();

    for (const [kind, key, attrChange] of updates) {
      // Forcing nodeID because we already tested it above.
      const nodeID = attrChange.nodeID || attrChange.node!.id;
      // Forcing attr because we already tested it above.
      const attr = this.attrs.get(nodeID)!.get(key)!;
      const sub = this.attribSubs.get(kind)?.get(key);
      if (sub) {
        sub.next({ attribute: attr, done: true });
      } else {
        let kAttrs = this.attrsByKind.get(kind);
        if (!kAttrs) {
          kAttrs = new Map<string, Map<string, Attribute>>();
          this.attrsByKind.set(kind, kAttrs);
        }

        let kkAttrs = kAttrs!.get(nodeID);
        if (!kkAttrs) {
          kkAttrs = new Map<string, Attribute>();
          kAttrs!.set(nodeID, kkAttrs);
        }

        kkAttrs.set(key, attr);
      }
    }
  }
}
