import test from "ava";
import { Subscriptions } from "./subscriptions";

test.serial("Subscriptions tracks scope id subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["123"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123", "456"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["456"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope kinds subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123"], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: ["123"], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123"], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123", "456"], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: ["456"], names: [], keys: [], kvs: [] },
    transitions: [],
  });

  subs.scopeSub({ ids: ["uyt"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: ["uyt"],
      kinds: ["123", "456"],
      names: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["uyt"], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope names subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ names: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], names: ["123"], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], names: ["123"], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ names: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], names: ["123"], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ names: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], names: ["123", "456"], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], names: ["456"], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });

  subs.scopeSub({ ids: ["uyt"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: ["uyt"],
      names: ["123", "456"],
      kinds: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["uyt"], names: [], kinds: [], keys: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope keys subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ keys: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], keys: ["123"], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], keys: ["123"], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ keys: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], keys: ["123"], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ keys: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], keys: ["123", "456"], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], keys: ["456"], kinds: [], names: [], kvs: [] },
    transitions: [],
  });

  subs.scopeSub({ ids: ["uyt"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: ["uyt"],
      keys: ["123", "456"],
      kinds: [],
      names: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["uyt"], keys: [], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope kvs subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kvs: [{ key: "123", val: "456" }] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: [],
      keys: [],
      kinds: [],
      names: [],
      kvs: [{ key: "123", val: "456" }],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: {
      ids: [],
      keys: [],
      kinds: [],
      names: [],
      kvs: [{ key: "123", val: "456" }],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kvs: [{ key: "123", val: "456" }] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: [],
      keys: [],
      kinds: [],
      names: [],
      kvs: [{ key: "123", val: "456" }],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kvs: [{ key: "abc", val: "def" }] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: [],
      keys: [],
      kinds: [],
      names: [],
      kvs: [
        { key: "123", val: "456" },
        { key: "abc", val: "def" },
      ],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: {
      ids: [],
      keys: [],
      kinds: [],
      names: [],
      kvs: [{ key: "abc", val: "def" }],
    },
    transitions: [],
  });

  subs.scopeSub({ ids: ["uyt"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      ids: ["uyt"],
      keys: [],
      kinds: [],
      names: [],
      kvs: [
        { key: "123", val: "456" },
        { key: "abc", val: "def" },
      ],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["uyt"], keys: [], kinds: [], names: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope kinds and ids subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123", "456"], ids: ["abc", "def"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      kinds: ["123", "456"],
      ids: ["abc", "def"],
      names: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: {
      kinds: ["123", "456"],
      ids: ["abc", "def"],
      names: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["9"], ids: ["z"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: {
      kinds: ["123", "456", "9"],
      ids: ["abc", "def", "z"],
      names: [],
      keys: [],
      kvs: [],
    },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { kinds: ["9"], ids: ["z"], names: [], keys: [], kvs: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks participants sub", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.participantsSub();

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: true,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.participantsSub();

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);
});

test.serial("Subscriptions tracks transitions sub", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("abc");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["abc"],
  });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("abc");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("xyz");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["abc", "xyz"],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: [], names: [], keys: [], kvs: [] },
    transitions: ["xyz"],
  });
});
