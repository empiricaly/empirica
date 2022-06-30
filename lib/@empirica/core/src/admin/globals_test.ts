import { SetAttributeInput, SubAttributesPayload } from "@empirica/tajriba";
import test from "ava";
import { Subject } from "rxjs";
import { Globals } from "./globals";

function setupGlobals() {
  const called: {
    setAttributes: SetAttributeInput[][];
  } = {
    setAttributes: [],
  };

  const globs = new Subject<SubAttributesPayload>();
  const globals = new Globals(
    globs,
    "globals",
    async (input: SetAttributeInput[]) => {
      called.setAttributes.push(input);
    }
  );

  return { globs, globals, called };
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

test("Globals should update update value", (t) => {
  const { globs, globals, called } = setupGlobals();
  globs.next(attrPayload({ key: "hello", val: `"world"`, done: true }));
  t.is(globals.get("hello"), "world");

  globals.set("hello", 123);
  t.is(globals.get("hello"), 123);
  t.deepEqual(called.setAttributes, [
    [
      {
        key: "hello",
        nodeID: "globals",
        val: "123",
      },
    ],
  ]);

  t.is(globals.get("hey"), undefined);

  globals.set("hey", 654, { immutable: true });
  t.is(globals.get("hey"), 654);
  t.deepEqual(called.setAttributes, [
    [
      {
        key: "hello",
        nodeID: "globals",
        val: "123",
      },
    ],
    [
      {
        key: "hey",
        nodeID: "globals",
        val: "654",
        immutable: true,
        append: undefined,
        index: undefined,
        private: undefined,
        protected: undefined,
        vector: undefined,
      },
    ],
  ]);
});
