import { SetAttributeInput } from "@empirica/tajriba";
import test from "ava";
import { captureLogs } from "../utils/console";
import { Attribute, Attributes } from "./attributes";
import {
  attrChange,
  partChange,
  scopeChange,
  setupProvider,
  textHasLog,
} from "./test_helpers";

function setupAttributes() {
  const { provider, changes } = setupProvider();

  const attributes = new Attributes(
    provider.attributes,
    provider.dones,
    provider.setAttributes
  );

  return { changes, attributes };
}

test("Attributes should update attributes on done", (t) => {
  const { changes, attributes } = setupAttributes();

  t.log("Not done, attribute === undefined");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "a").value, undefined);

  t.log("Done, attribute === val");

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

  t.log("No update using same attribute ID");

  changes.next(
    attrChange({
      key: "a",
      val: "3",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "a").value, 2);

  t.log("Update using different attribute ID");

  changes.next(
    attrChange({
      id: "otherid",
      key: "a",
      val: "4",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  t.is(attributes.attribute("abc", "a").value, 4);

  t.log("Test with other value");

  const bAttr = attributes.attribute("abc", "b");
  changes.next(
    attrChange({
      key: "b",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(bAttr.value, undefined);

  t.log("Done with other change type updates value");

  changes.next(
    scopeChange({ done: true, kind: "game", id: "abc", removed: false })
  );

  t.is(attributes.attribute("abc", "b").value, 1);

  t.log("Updated previously catured attribute");

  t.is(bAttr.value, 1);
});

test("Attributes next should return next value", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.is(attributes.nextAttributeValue("abc", "a"), 1);
});

test("Attributes next should return next value even if current", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "0",
      nodeID: "abc",
      done: true,
      removed: false,
    })
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
  t.is(attributes.nextAttributeValue("abc", "a"), 1);
});

test("Attributes next should return current value if no next", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(attributes.nextAttributeValue("abc", "a"), 1);
});

test("Attributes next should return nothing if next deleted", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: true,
    })
  );

  t.is(attributes.nextAttributeValue("abc", "a"), undefined);
});

test("Attributes next should return undefined if next val undefined", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: undefined,
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );

  t.is(attributes.nextAttributeValue("abc", "a"), undefined);
});

test("Attributes next should return undefined if key missing", (t) => {
  const { attributes } = setupAttributes();

  t.is(attributes.nextAttributeValue("abc", "a"), undefined);
});

test("Attributes should be removed", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  const attrib = attributes.attribute("abc", "a");
  t.truthy(attrib);
  t.is(attrib.value, 1);

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: true,
    })
  );

  // Attribute should still be queryable
  const attribAgain = attributes.attribute("abc", "a");
  t.truthy(attribAgain);

  // But should be undefined
  t.is(attribAgain.value, undefined);

  // And previous attrib capture should also be undefined
  t.is(attrib.value, undefined);
});

test("Attributes should track if scope is updated", (t) => {
  const { changes, attributes } = setupAttributes();

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );

  t.false(attributes.scopeWasUpdated());
  t.true(attributes.scopeWasUpdated("abc"));

  changes.next(partChange({ done: true }));

  t.false(attributes.scopeWasUpdated("abd"));
});

test("Attributes peek should return attribute if exists", (t) => {
  const { changes, attributes } = setupAttributes();

  t.log("non-existing scope");

  t.is(attributes.attributePeek("xyz", "a"), undefined);

  t.log("no value next attribute");

  changes.next(
    attrChange({
      key: "a",
      val: "",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );

  t.is(attributes.attributePeek("abc", "a"), undefined);

  t.log("next attribute");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );

  t.is(attributes.attributePeek("abc", "a")!.key, "a");
  t.is(attributes.attributePeek("abc", "a")!.value, 1);

  t.log("current attribute");

  changes.next(
    attrChange({
      key: "a",
      val: "2",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(attributes.attributePeek("abc", "a")!.key, "a");
  t.is(attributes.attributePeek("abc", "a")!.value, 2);

  t.log("unknown attribute");

  t.is(attributes.attributePeek("abc", "b"), undefined);

  t.log("going to remove scope");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: true,
    })
  );

  t.is(attributes.attributePeek("abc", "a"), undefined);

  t.log("removed scope");

  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: true,
    })
  );

  t.is(attributes.attributePeek("abc", "a"), undefined);
});

test("Attributes update without any node ID should fail", (t) => {
  const { changes, attributes } = setupAttributes();

  const logs = captureLogs(function () {
    changes.next(
      attrChange({
        key: "a",
        val: "1",
        nodeID: "",
        done: true,
        removed: false,
      })
    );
  });

  textHasLog(t, logs, "error", "new attribute without node ID");

  t.is(attributes.attributePeek("abc", "a"), undefined);

  const logs2 = captureLogs(function () {
    changes.next(
      attrChange({
        key: "a",
        val: "1",
        nodeID: "",
        noNode: true,
        done: true,
        removed: false,
      })
    );
  });

  textHasLog(t, logs2, "error", "new attribute without node ID");

  t.is(attributes.attributePeek("abc", "a"), undefined);
});

test("Attribute returns nodeID", (t) => {
  /* c8 ignore next */
  const setAttr = async (_: SetAttributeInput[]) => {};

  const attr = new Attribute(setAttr, "abc", "a");

  t.is(attr.nodeID, "abc");

  attr._update({
    id: "1",
    key: "a",
    vector: false,
    version: 0,
    nodeID: "xyz",
  });
  t.is(attr.nodeID, "xyz");

  attr._update({
    id: "2",
    key: "a",
    vector: false,
    version: 0,
    node: {
      __typename: "Scope",
      id: "hey",
      kind: "game",
    },
  });
  t.is(attr.nodeID, "hey");
});
