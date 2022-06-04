import {
  ChangePayload,
  SetAttributeInput,
  SubAttributesPayload,
} from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { Attributes } from "./attributes";
import { TajribaProvider } from "./provider";
import { attrChange, scopeChange } from "./test_helpers";

test("Attributes should update attributes on done", (t) => {
  const changes = new Subject<ChangePayload>();
  const globals = new Subject<SubAttributesPayload>();
  const setAttributes = async (input: SetAttributeInput[]) => {};
  const provider = new TajribaProvider(changes, globals, setAttributes);

  const attributes = new Attributes(
    provider.attributes,
    provider.dones,
    provider.setAttributes
  );

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "a").value, null);

  changes.next(
    attrChange({
      key: "a",
      val: "2",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "a").value, 2);

  //

  changes.next(
    attrChange({
      key: "b",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "b").value, null);

  changes.next(scopeChange({ done: true, removed: false }));
  t.is(attributes.attribute("abc", "b").value, 1);
});
