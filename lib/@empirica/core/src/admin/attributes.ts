import { Observable, Subject } from "rxjs";
import {
  Attribute,
  AttributeChange,
  Attributes as SharedAttributes,
} from "../shared/attributes";
import { warn } from "../utils/console";

export class Attributes extends SharedAttributes {
  private attribSubs = new Map<string, Map<string, Subject<Attribute>>>();

  subscribeAttribute(kind: string, key: string): Observable<Attribute> {
    if (!this.attribSubs.has(kind)) {
      this.attribSubs.set(kind, new Map<string, Subject<Attribute>>());
    }

    const keyMap = this.attribSubs.get(kind)!;
    if (!keyMap.has(key)) {
      keyMap.set(key, new Subject<Attribute>());
    }

    return keyMap.get(key)!;
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
      const keyMap = this.attribSubs.get(kind);
      if (keyMap) {
        for (const attr of attrs) {
          if (keyMap.has(attr.key)) {
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
      }
    }

    super.next();

    for (const [kind, key, attrChange] of updates) {
      // Forcing nodeID because we already tested it above.
      const nodeID = attrChange.nodeID || attrChange.node!.id;
      // Forcing attr because we already tested it above.
      const attr = this.attrs.get(nodeID)!.get(key)!;
      this.attribSubs.get(kind)!.get(key)!.next(attr);
    }
  }
}
