import test from "ava";
import {
  attrChange,
  partChange,
  scopeChange,
  setupProvider,
  stepChange,
} from "../shared/test_helpers";

test("TajribaProvider should split out scope, attribute and participant changes", (t) => {
  const { changes, provider } = setupProvider();

  let dones = 0;
  provider.dones.subscribe({
    next: () => {
      dones++;
    },
  });

  let attrs = [];
  provider.attributes.subscribe({
    next: (attr) => {
      attrs.push(attr);
    },
  });

  let parts = [];
  provider.participants.subscribe({
    next: (part) => {
      parts.push(part);
    },
  });

  let scopes = [];
  provider.scopes.subscribe({
    next: (scope) => {
      scopes.push(scope);
    },
  });

  let steps = [];
  provider.steps.subscribe({
    next: (step) => {
      steps.push(step);
    },
  });

  changes.next(partChange({ done: false, removed: false }));
  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: false,
      removed: false,
    })
  );
  changes.next(
    attrChange({
      key: "a",
      val: "1",
      nodeID: "abc",
      done: true,
      removed: false,
    })
  );
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(stepChange({ done: false, removed: false }));
  changes.next(
    scopeChange({ id: "123", kind: "round", done: true, removed: false })
  );

  t.is(dones, 2);
  t.is(attrs.length, 2);
  t.is(parts.length, 1);
  t.is(scopes.length, 1);
  t.is(steps.length, 3);
});
