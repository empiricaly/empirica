import test from "ava";
import sinon from "sinon";
import {
  completeBatchConfig,
  Gam,
  gameInitCallbacks,
  getUniqueNS,
  makeCallbacks,
  makePlayer,
  Playr,
  Playrs,
  sleep,
  withContext,
  withTajriba,
} from "./e2e_test_helpers";
import { ClassicListenersCollector } from "./proxy";

const t = test;
// const t = test.serial;
const to = test.only;

t("ready called when ready", async (t) => {
  await withTajriba(async (port: number) => {
    const playersProms: Promise<Playr>[] = [];

    const playerCount = 2;
    for (let i = 0; i < playerCount; i++) {
      playersProms.push(makePlayer(port, i.toString()));
    }

    const players: Playr[] = [];
    (await Promise.allSettled(playersProms)).forEach((p) => {
      if (p.status == "fulfilled") {
        players.push(p.value);
      } else {
        console.error(p.reason);
      }
    });

    const callbacks = await makeCallbacks(port);

    for (const player of players) {
      t.truthy(await player.awaitPlayer);
    }

    await callbacks.stop();
    for (const player of players) {
      player.stop();
    }
  });
});

t("experimentOpen starts undefined", async (t) => {
  const Empirica = new ClassicListenersCollector();

  // Also checking ready is only called once
  var ready = sinon.fake();
  Empirica.on("ready", () => {
    ready();
  });

  await withContext(
    2,
    async ({ players }) => {
      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), undefined);
      }
    },
    { listeners: Empirica }
  );

  t.assert(ready.calledOnce);
});

t("experimentOpen is undefined on new batch", async (t) => {
  await withContext(2, async ({ players, admin }) => {
    await admin.createBatch(completeBatchConfig(1));
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), undefined);
    }
  });
});

t("experimentOpen is true on batch started", async (t) => {
  await withContext(2, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await players.awaitGlobals("experimentOpen");
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), true);
    }
  });
});

t("experimentOpen is false on batch terminated", async (t) => {
  await withContext(2, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await sleep(100);
    await batch.terminated();
    await players.awaitGlobals("experimentOpen");
    await sleep(200);
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), false);
    }
  });
});

t("new participants get new Player", async (t) => {
  await withContext(2, async ({ players }) => {
    await players.awaitPlayerExist();
    for (const player of players) {
      t.truthy(player.player);
    }
  });
});

t("games get created on new batch once", async (t) => {
  await withContext(2, async ({ admin, players, makeCallbacks }) => {
    await players.awaitPlayerExist();
    await admin.createBatch(completeBatchConfig(1));
    await sleep(100);
    const games = await admin.getGames();
    t.is(games!.length, 1);
    const cbs = await makeCallbacks();
    const games2 = await admin.getGames();
    t.is(games2!.length, 1);
    await cbs.stop();
  });
});

t("existing player connecting get assigned", async (t) => {
  await withContext(1, async ({ admin, players }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await sleep(100); // games get created
    batch.running();
    await players.awaitPlayerKeyExist("gameID");
    for (const player of players) {
      t.truthy(player.player?.get("gameID"));
    }
  });
});

t("new player gets assigned if still online", async (t) => {
  await withContext(1, async ({ admin, makePlayer, players }) => {
    if (players.length !== 1) {
      throw "wrong amount of players";
    }

    let ns: string = "";
    for (const player of players) {
      player.stop();
      ns = player.ns;
    }

    if (!ns) {
      throw "no player??";
    }

    const batch = await admin.createBatch(completeBatchConfig(1));
    await sleep(100); // games get created
    await batch.running();
    const player1 = await makePlayer(ns);
    const player = await player1.awaitPlayerExists();
    await player1.awaitPlayerKeyExist("gameID");
    t.truthy(player?.get("gameID"));
    player1.stop();
  });
});

t("players are randomly assigned to unstarted games", async (t) => {
  await withContext(10, async ({ admin, players }) => {
    const batch = await admin.createBatch(completeBatchConfig(2, 2));
    await sleep(100); // games get created
    batch.running();
    await players.awaitPlayerKeyExist("gameID");
    const distribution = new Map<string, number>();
    for (const player of players) {
      const gameID = player.player?.get("gameID") as string;
      t.truthy(gameID);
      distribution.set(gameID, (distribution.get(gameID) || 0) + 1);
    }

    t.is(distribution.size, 2);
    for (const count of distribution.values()) {
      t.true(count > 0);
    }
  });
});

t(
  "if 2 batch running, players are randomly assigned to first started batch",
  async (t) => {
    await withContext(
      0,
      async ({ admin, makePlayer }) => {
        const batch = await admin.createBatch(completeBatchConfig(2, 2));
        const batch2 = await admin.createBatch(completeBatchConfig(2, 2));
        await sleep(100); // games get created
        batch.running();
        batch2.running();
        const playrs: Playr[] = [];
        for (let i = 0; i < 10; i++) {
          playrs.push(await makePlayer(getUniqueNS()));
        }
        const players = new Playrs(playrs);

        await players.awaitPlayerKeyExist("gameID");

        const distribution = new Map<string, number>();
        for (const player of players) {
          const gameID = player.player?.get("gameID") as string;
          t.truthy(gameID);
          distribution.set(gameID, (distribution.get(gameID) || 0) + 1);
        }

        t.is(distribution.size, 2);
        for (const count of distribution.values()) {
          t.true(count > 0);
        }

        for (const player of playrs) {
          player.stop();
        }
      },
      { doNotRegisterPlayers: true }
    );
  }
);

t("when solo player introDone, game starts", async (t) => {
  await withContext(
    1,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(1));
      await sleep(100); // games get created
      batch.running();
      await players.awaitPlayerKeyExist("gameID");
      for (const player of players) {
        player.player!.set("introDone", true);
      }
      await sleep(100); // game start
      const games = await players.awaitGameExist();
      t.truthy(games);
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t("when enough player introDone, game starts", async (t) => {
  await withContext(
    2,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(2));
      await sleep(100); // games get created
      batch.running();
      await players.awaitPlayerKeyExist("gameID");
      for (const player of players) {
        player.player!.set("introDone", true);
      }
      await sleep(100); // game start
      const games = await players.awaitGameExist();
      t.truthy(games);
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t(
  "when the first game starts, players are reassigned to other games with same treatment",
  async (t) => {
    await withContext(
      2,
      async ({ admin, players }) => {
        const batch = await admin.createBatch(completeBatchConfig(1));
        const batch2 = await admin.createBatch(completeBatchConfig(1));
        await sleep(100); // games get created
        batch.running();
        await players.awaitPlayerKeyExist("gameID");

        const player1 = players.get(0) as Playr;
        const player2 = players.get(1) as Playr;
        const batch1Game = (await batch.games())![0] as Gam;
        const batch2Game = (await batch2.games())![0] as Gam;

        // player1 and player2 have same gameID
        t.is(player1.player?.get("gameID"), batch1Game.id);
        t.is(player2.player?.get("gameID"), batch1Game.id);

        player1.player!.set("introDone", true);

        await sleep(100); // game start, reassign

        // player2 assigned to new gameID
        t.is(player1.player?.get("gameID"), batch1Game.id);
        t.not(player2.player?.get("gameID"), batch2Game.id);
      },
      {
        listeners: gameInitCallbacks(),
      }
    );
  }
);

t(
  "when the first game starts, players are reassigned to games in currnet batch",
  async (t) => {
    await withContext(
      10,
      async ({ admin, players }) => {
        const batch = await admin.createBatch(completeBatchConfig(1, 2));
        await admin.createBatch(completeBatchConfig(1));
        await sleep(100); // games get created
        batch.running();
        await players.awaitPlayerKeyExist("gameID");

        const batch1Games = await batch.games();
        const batch1GameIDs = batch1Games!.map((g) => g.id);

        const distribution = new Map<string, number>();
        for (const player of players) {
          const gameID = player.player?.get("gameID") as string;
          t.true(batch1GameIDs.includes(gameID));
          distribution.set(gameID, (distribution.get(gameID) || 0) + 1);
        }

        t.is(distribution.size, 2);
        for (const count of distribution.values()) {
          t.true(count > 1);
        }

        const player1 = players.get(0)!;
        player1.player!.set("introDone", true);

        await sleep(200); // game start, reassign

        distribution.clear();
        for (const player of players) {
          const gameID = player.player?.get("gameID") as string;
          t.true(batch1GameIDs.includes(gameID));
          distribution.set(gameID, (distribution.get(gameID) || 0) + 1);
        }

        const player1GameID = player1.player!.get("gameID") as string;
        const player2GameID = (await players
          .get(1)!
          .player!.get("gameID")) as string;

        t.is(distribution.size, 2);
        t.is(distribution.get(player1GameID), 1);
        t.is(distribution.get(player2GameID), 9);
      },
      {
        listeners: gameInitCallbacks(),
      }
    );
  }
);

t("when the game starts, players are kicked if no other game", async (t) => {
  await withContext(
    10,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(1));
      await sleep(100); // games get created
      batch.running();
      await players.awaitPlayerKeyExist("gameID");

      const batch1Games = await batch.games();
      const batch1GameIDs = batch1Games!.map((g) => g.id);

      t.is(batch1GameIDs.length, 1);
      const gameID = batch1GameIDs[0] as string;

      for (const player of players) {
        t.is(player.player?.get("gameID") as string, gameID);
      }

      const player1 = players.get(0)!;
      player1.player!.set("introDone", true);

      await sleep(200); // game start, reassign

      for (const player of players) {
        const ended = player.player?.get("ended");
        if (player === player1) {
          t.is(ended, undefined);
        } else {
          t.is(ended, "no more games");
        }
      }
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t(
  "when the game starts, players are kicked if no other game with same treatment",
  async (t) => {
    await withContext(
      10,
      async ({ admin, players }) => {
        const batch = await admin.createBatch(
          completeBatchConfig(1, 1, [{ a: 1 }, { b: 2 }])
        );

        await sleep(200); // games get created
        batch.running();
        await players.awaitPlayerKeyExist("gameID");

        const batch1Games = await batch.games();
        const batch1GameIDs = batch1Games!.map((g) => g.id);

        t.is(batch1GameIDs.length, 2);
        const gameID1 = batch1GameIDs[0] as string;
        const gameID2 = batch1GameIDs[1] as string;

        const distribution = new Map<string, number>();
        for (const player of players) {
          const gameID = player.player?.get("gameID") as string;
          t.true(gameID1 === gameID || gameID2 === gameID);
          distribution.set(gameID, (distribution.get(gameID) || 0) + 1);
        }

        const player1 = players.get(0)!;
        const player1gameID = player1.player?.get("gameID") as string;
        player1.player!.set("introDone", true);

        await sleep(200); // game start, reassign

        let endedPlayersCount = 0;

        for (const player of players) {
          const ended = player.player?.get("ended");
          const gameID = player.player?.get("gameID") as string;
          if (player === player1 || (gameID && gameID !== player1gameID)) {
            t.true(ended === undefined);
          } else {
            t.is(ended, "no more games");
            endedPlayersCount++;
          }
        }

        t.is(distribution.size, 2);
        for (const [gameID, count] of distribution.entries()) {
          if (gameID === player1gameID) {
            t.is(count - 1, endedPlayersCount);
          }
        }
      },
      {
        listeners: gameInitCallbacks(),
      }
    );
  }
);

t("when all games started, experiment closes", async (t) => {
  await withContext(
    2,
    async ({ players, admin }) => {
      t.is(players.length, 2);

      const batch = await admin.createBatch(completeBatchConfig(1));
      await sleep(100); // games get created
      batch.running();

      await players.awaitGlobals("experimentOpen");
      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), true);
      }

      const player1 = players.get(0)!;

      await player1?.register();
      await sleep(100); // assignment

      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), true);
      }

      await player1.awaitPlayer();

      player1.player!.set("introDone", true);

      await player1.awaitGame();

      await sleep(100); // experiment closing

      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), false);
      }
    },
    {
      listeners: gameInitCallbacks(),
      doNotRegisterPlayers: true,
    }
  );
});

to("when running game terminated, players are kicked", async (t) => {
  await withContext(
    2,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(2));
      await sleep(100); // games get created
      batch.running();
      await players.awaitPlayerKeyExist("gameID");
      for (const player of players) {
        player.player!.set("introDone", true);
      }
      await sleep(100); // game start
      const games = await players.awaitGameExist();
      t.truthy(games);

      console.log(games);
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});
