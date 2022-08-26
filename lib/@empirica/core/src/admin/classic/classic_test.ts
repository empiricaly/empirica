import test from "ava";
import sinon from "sinon";
import { completeBatchConfig, withContext } from "./e2e_test_helpers";
import { ClassicListenersCollector } from "./proxy";

test("experimentOpen starts undefined", async (t) => {
  const Empirica = new ClassicListenersCollector();

  // Also checking ready is only called once
  var ready = sinon.fake();
  Empirica.on("ready", () => {
    ready();
  });

  await withContext(
    2,
    async ({ players, admin }) => {
      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), undefined);
      }
    },
    { listeners: Empirica }
  );

  t.assert(ready.calledOnce);
});

test("experimentOpen is undefined on new batch", async (t) => {
  await withContext(3, async ({ players, admin }) => {
    await admin.createBatch(completeBatchConfig(1));
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), undefined);
    }
  });
});

test("experimentOpen is true on batch started", async (t) => {
  await withContext(4, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await players.awaitGlobals("experimentOpen");
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), true);
    }
  });
});

test("experimentOpen is false on batch terminated", async (t) => {
  await withContext(5, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await batch.terminated();
    await players.awaitGlobals("experimentOpen");
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), false);
    }
  });
});
