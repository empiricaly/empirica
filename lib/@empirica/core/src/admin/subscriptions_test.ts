import test from "ava";
import { Subscriptions } from "./subscriptions";

test.serial("Subscriptions tracks scope id subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123"], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["123"], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123"], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ ids: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: ["123", "456"], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: ["456"], kinds: [] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope kinds subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: ["123"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["456"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: ["123", "456"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: ["456"] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks scope kinds and ids subs", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["123", "456"], ids: ["abc", "def"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { kinds: ["123", "456"], ids: ["abc", "def"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { kinds: ["123", "456"], ids: ["abc", "def"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.scopeSub({ kinds: ["9"], ids: ["z"] });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { kinds: ["123", "456", "9"], ids: ["abc", "def", "z"] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { kinds: ["9"], ids: ["z"] },
    transitions: [],
  });
});

test.serial("Subscriptions tracks participants sub", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.participantsSub();

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), {
    participants: true,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.participantsSub();

  t.deepEqual(subs.subs, {
    participants: true,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);
});

test.serial("Subscriptions tracks transitions sub", async (t) => {
  const subs = new Subscriptions();
  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: [],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("abc");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["abc"],
  });

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("abc");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["abc"],
  });
  t.deepEqual(subs.newSubs(), undefined);

  subs.transitionsSub("xyz");

  t.deepEqual(subs.subs, {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["abc", "xyz"],
  });
  t.deepEqual(subs.newSubs(), {
    participants: false,
    scopes: { ids: [], kinds: [] },
    transitions: ["xyz"],
  });
});
