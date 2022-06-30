import { SetAttributeInput, SubAttributesPayload } from "@empirica/tajriba";
import { Observable } from "rxjs";
import { AttributeOptions } from "../player";
import { Globals as SharedGlobals } from "../shared/globals";
import { JsonValue } from "../utils/json";
import { bsu } from "../utils/object";

export class Globals extends SharedGlobals {
  constructor(
    globals: Observable<SubAttributesPayload>,
    private globalScopeID: string,
    private setAttributes: (input: SetAttributeInput[]) => Promise<unknown>
  ) {
    super(globals);
  }

  set(key: string, value: JsonValue, ao?: Partial<AttributeOptions>) {
    let attr = this.attrs.get(key);
    if (!attr) {
      attr = bsu();
      this.attrs.set(key, attr);
    }
    attr.next(value);

    const attrProps: SetAttributeInput = {
      key: key,
      nodeID: this.globalScopeID,
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
  }
}
