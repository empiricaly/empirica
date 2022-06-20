import test from "ava";
import { Attribute } from "../shared/attributes";
import { attrChange, setupProvider } from "../shared/test_helpers";
import { Attributes } from "./attributes";

function setupAttributes() {
  const { provider, changes } = setupProvider();

  const attributes = new Attributes(
    provider.attributes,
    provider.dones,
    provider.setAttributes
  );

  return { changes, attributes };
}

test("Attributes should be subscribable", (t) => {
  const { changes, attributes } = setupAttributes();

  const vals: Attribute[] = [];
  attributes.subscribeAttribute("game", "a").subscribe({
    next: (attribute) => {
      vals.push(attribute);
    },
  });

  changes.next(
    attrChange({
      id: "x",
      key: "a",
      val: "41",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.deepEqual(vals, []);

  changes.next(
    attrChange({
      id: "y",
      key: "a",
      val: "42",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.key, "a");
  t.is(vals[0]!.value, 42);

  changes.next(
    attrChange({
      id: "z",
      key: "a",
      val: "84",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 2);
  t.is(vals[1]!.key, "a");
  t.is(vals[1]!.value, 84);
});

// Deletes should not happen on server anyway...
test("Attributes subscriptions should ignore deletes", (t) => {
  const { changes, attributes } = setupAttributes();

  const vals: Attribute[] = [];
  attributes.subscribeAttribute("game", "a").subscribe({
    next: (attribute) => {
      vals.push(attribute);
    },
  });

  changes.next(
    attrChange({
      id: "x",
      key: "a",
      val: "41",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.deepEqual(vals, []);

  changes.next(
    attrChange({
      id: "y",
      key: "a",
      val: "42",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.key, "a");
  t.is(vals[0]!.value, 42);

  changes.next(
    attrChange({
      id: "z",
      key: "a",
      val: "84",
      nodeID: "abc",
      done: true,
      removed: true,
    })
  );

  t.is(vals.length, 1);
});

// Deletes should not happen on server anyway...
test("Attributes with missing node fail gracefully", (t) => {
  const { changes, attributes } = setupAttributes();

  const vals: Attribute[] = [];
  attributes.subscribeAttribute("game", "a").subscribe({
    next: (attribute) => {
      vals.push(attribute);
    },
  });

  changes.next(
    attrChange({
      id: "x",
      key: "a",
      val: "41",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.deepEqual(vals, []);

  changes.next(
    attrChange({
      id: "y",
      key: "a",
      val: "42",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.key, "a");
  t.is(vals[0]!.value, 42);

  changes.next(
    attrChange({
      id: "z",
      key: "a",
      val: "84",
      nodeID: "abc",
      noNode: true,
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
});

// Deletes should not happen on server anyway...
test("Attributes with node and no nodeID", (t) => {
  const { changes, attributes } = setupAttributes();

  const vals: Attribute[] = [];
  attributes.subscribeAttribute("game", "a").subscribe({
    next: (attribute) => {
      vals.push(attribute);
    },
  });

  changes.next(
    attrChange({
      id: "x",
      key: "a",
      val: "41",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  t.deepEqual(vals, []);

  changes.next(
    attrChange({
      id: "y",
      key: "a",
      val: "42",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );

  t.is(vals.length, 1);
  t.is(vals[0]!.key, "a");
  t.is(vals[0]!.value, 42);

  // const logs = captureLogs(function () {
  changes.next(
    attrChange({
      id: "z",
      key: "a",
      val: "84",
      noNodeID: true,
      done: true,
      removed: false,
    })
  );
  // });

  // textHasLog(t, logs, "error", "new attribute without node ID");
  t.is(vals.length, 2);
});
