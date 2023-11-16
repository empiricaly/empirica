import { SubAttributesPayload } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { JsonValue } from "../utils/json";
import { Globals } from "./globals";

function setupGlobals() {
  const globs = new Subject<SubAttributesPayload>();
  const globals = new Globals(globs);
  return { globs, globals };
}

interface attrPayloadProps {
  done: boolean;
  id: string;
  nodeID: string;
  key: string;
  val: string;
}

const attrPayloadDefaults: attrPayloadProps = {
  done: true,
  id: "123",
  nodeID: "abc",
  key: "123",
  val: "1",
};

export function attrPayload(
  props: Partial<attrPayloadProps>
): SubAttributesPayload {
  const { done, id, nodeID, key, val } = {
    ...attrPayloadDefaults,
    ...props,
  };

  return {
    __typename: "SubAttributesPayload",
    attribute: {
      __typename: "Attribute",
      id,
      node: {
        id: nodeID,
      },
      vector: false,
      version: 1,
      key,
      val,
      createdAt: 0,
      createdBy: {
        id: "deckard",
        __typename: "Service",
        createdAt: 0,
        name: "wt",
      },
      current: true,
      immutable: false,
      private: false,
      protected: false,
    },
    done,
    isNew: false,
  };
}

const attrPayloadDoneOnly: SubAttributesPayload = {
  __typename: "SubAttributesPayload",
  done: true,
  isNew: false,
};

test("Globals should update on done", (t) => {
  const { globs, globals } = setupGlobals();
  globs.next(attrPayload({ key: "hello", val: `"world"`, done: false }));
  t.is(globals.get("hello"), undefined);

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: true }));
  t.is(globals.get("hello"), "world");
});

test("Globals should update on done only", (t) => {
  const { globs, globals } = setupGlobals();
  globs.next(attrPayload({ key: "hello", val: `"world"`, done: false }));
  t.is(globals.get("hello"), undefined);

  globs.next(attrPayloadDoneOnly);
  t.is(globals.get("hello"), "world");
});

test("Globals should be observable", (t) => {
  const { globs, globals } = setupGlobals();

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: true }));

  const vals: (JsonValue | undefined)[] = [];
  globals.obs("hello").subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, ["world"]);

  globs.next(attrPayload({ key: "hello", val: `"taj"`, done: true }));

  t.deepEqual(vals, ["world", "taj"]);
});

test("Globals should be observable, pre-init", (t) => {
  const { globs, globals } = setupGlobals();

  const vals: (JsonValue | undefined)[] = [];
  globals.obs("hello").subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [undefined]);

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: false }));

  t.deepEqual(vals, [undefined]);

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: true }));

  t.deepEqual(vals, [undefined, "world"]);
});

test("Globals itself should be observable", (t) => {
  const { globs, globals } = setupGlobals();

  const vals: (Globals | undefined)[] = [];
  globals.self!.subscribe({
    next(val) {
      vals.push(val);
    },
  });

  t.deepEqual(vals, [globals]);

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: false }));

  t.deepEqual(vals, [globals]);

  globs.next(attrPayload({ key: "hello", val: `"world"`, done: true }));

  t.deepEqual(vals, [globals, globals]);
});
