import { SubAttributesPayload } from "@empirica/tajriba";
import { BehaviorSubject, Observable } from "rxjs";
import { JsonValue } from "../utils/json";

export class Globals {
  protected attrs = new Map<string, BehaviorSubject<JsonValue | undefined>>();
  private updates = new Map<string, JsonValue | undefined>();
  public self: BehaviorSubject<Globals | undefined>;

  constructor(globals: Observable<SubAttributesPayload>) {
    this.self = new BehaviorSubject<Globals | undefined>(undefined);

    globals.subscribe({
      next: ({ attribute, done }) => {
        if (attribute) {
          let val = undefined;
          if (attribute.val) {
            val = JSON.parse(attribute.val);
          }

          this.updates.set(attribute.key, val);
        }

        if (done) {
          for (const [key, val] of this.updates) {
            this.obs(key).next(val);
          }

          this.updates.clear();

          if (this.self) {
            this.self.next(this);
          }
        }
      },
    });
  }

  get(key: string): JsonValue | undefined {
    const o = this.attrs.get(key);
    if (o) {
      return o.getValue();
    }

    return undefined;
  }

  obs(key: string) {
    let o = this.attrs.get(key);
    if (!o) {
      o = new BehaviorSubject<JsonValue | undefined>(undefined);
      this.attrs.set(key, o);
    }

    return o;
  }
}
