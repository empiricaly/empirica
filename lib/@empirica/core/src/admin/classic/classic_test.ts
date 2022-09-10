import test from "ava";
import sinon from "sinon";
import { ListenersCollector } from "../events";
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
import { ClassicKinds, Context, Game, Player } from "./models";

const t = test;
// const t = test.serial;
const to = test.only;

t("ready called when ready", async (t) => {
  await withTajriba(t, async (port: number) => {
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
  // Also checking ready is only called once
  var ready = sinon.fake();

  await withContext(
    t,
    2,
    async ({ players }) => {
      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), undefined);
      }

      // NOTE: Sleeping a bit so we don't hit an closed connection
      // error. We should not get that error if we were closing properly, but it
      // only happens in this extreme case, so skipping for now.
      await sleep(200);
    },
    {
      listeners: function (_: ListenersCollector<Context, ClassicKinds>) {
        _.on("ready", () => {
          ready();
        });
      },
    }
  );

  t.assert(ready.calledOnce);
});

t("experimentOpen is undefined on new batch", async (t) => {
  await withContext(t, 2, async ({ players, admin }) => {
    await admin.createBatch(completeBatchConfig(1));
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), undefined);
    }
  });
});

t("experimentOpen is true on batch started", async (t) => {
  await withContext(t, 2, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await players.awaitGlobals("experimentOpen");
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), true);
    }
  });
});

t("experimentOpen is false on batch terminated", async (t) => {
  await withContext(t, 2, async ({ players, admin }) => {
    const batch = await admin.createBatch(completeBatchConfig(1));
    await batch.running();
    await players.awaitGlobals("experimentOpen");
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), true);
    }
    await batch.terminated();
    await players.awaitGlobals("experimentOpen");
    // await sleep(200);
    for (const player of players) {
      t.is(player.globals.get("experimentOpen"), false);
    }
  });
});

t("new participants get new Player", async (t) => {
  await withContext(t, 2, async ({ players }) => {
    await players.awaitPlayerExist();
    for (const player of players) {
      t.truthy(player.player);
    }
  });
});

t("games get created on new batch once", async (t) => {
  await withContext(t, 2, async ({ admin, players, makeCallbacks }) => {
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
  await withContext(t, 1, async ({ admin, players }) => {
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
  await withContext(t, 1, async ({ admin, makePlayer, players }) => {
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
  await withContext(t, 10, async ({ admin, players }) => {
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
      t,
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
    t,
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
      t.truthy(games[0]);
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t("when enough player introDone, game starts", async (t) => {
  await withContext(
    t,
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
      t.truthy(games[0]);
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
      t,
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
  "when the first game starts, players are reassigned to games in current batch",
  async (t) => {
    await withContext(
      t,
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
          t.true(count > 0);
        }

        const player1 = players.get(0)!;
        player1.player!.set("introDone", true);

        await sleep(300); // game start, reassign

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
    t,
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

      await player1.awaitGame();
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
      t,
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

        await player1.awaitGame();
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
    t,
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
      await player1.awaitPlayer();

      for (const player of players) {
        t.is(player.globals.get("experimentOpen"), true);
      }

      player1.player!.set("introDone", true);

      await player1.awaitGame();

      await sleep(200); // experiment closing

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

t("when game terminated, players are kicked", async (t) => {
  await withContext(
    t,
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
      await players.awaitGameExist();

      for (const player of players) {
        t.truthy(player.game);
      }

      const games = await batch.games();
      const game = games![0]!;
      t.truthy(game);

      await game.end("terminated", "testing");

      await players.awaitGame();

      for (const player of players) {
        t.falsy(player.game);
      }
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t("when last game terminated, batch ends", async (t) => {
  await withContext(
    t,
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
      await players.awaitGameExist();

      for (const player of players) {
        t.truthy(player.game);
      }

      const games = await batch.games();
      const game = games![0]!;
      t.truthy(game);

      await game.end("terminated", "testing");

      await players.awaitGame();

      for (const player of players) {
        t.falsy(player.game);
      }
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t("on game start, players get game, round, stange and playerX", async (t) => {
  await withContext(
    t,
    2,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(2));
      await sleep(100); // games get created
      batch.running();

      await players.awaitPlayerKeyExist("gameID");
      for (const player of players) {
        player.player!.set("introDone", true);
      }

      await players.awaitGameExist();
      await players.awaitRoundExist();
      await players.awaitStageExist();

      for (const player of players) {
        t.truthy(player.game);
        t.truthy(player.player?.game);
        t.truthy(player.round);
        t.truthy(player.player?.round);
        t.truthy(player.stage);
        t.truthy(player.player?.stage);
      }
    },
    {
      listeners: gameInitCallbacks(),
    }
  );
});

t("on stage submit, if all players submit, stage ends", async (t) => {
  await withContext(
    t,
    2,
    async ({ admin, players }) => {
      const batch = await admin.createBatch(completeBatchConfig(2));
      await sleep(100); // games get created
      batch.running();
      await players.awaitPlayerKeyExist("gameID");
      for (const player of players) {
        player.player!.set("introDone", true);
      }
      await players.awaitGameExist();
      await players.awaitRoundExist();
      const stages = await players.awaitStageExist();
      const stage1 = stages![0]!;

      for (const player of players) {
        player.player!.stage!.set("submit", true);
      }

      await players.awaitStage(); // stage1 goes away
      await players.awaitStage(); // stage2 comes in
      await sleep(100); // games get created

      const stage2 = players.stage![0]!;

      t.truthy(stage1);
      t.truthy(stage2);
      t.not(stage1.id, stage2.id);
    },
    {
      listeners: gameInitCallbacks(1, 2),
    }
  );
});

t("players can be manually assigned to unstarted games", async (t) => {
  await withContext(
    t,
    4,
    async ({ admin, players, callbacks }) => {
      const batch = await admin.createBatch(completeBatchConfig(2, 2));
      await sleep(200); // games get created
      batch.running();

      await players.awaitPlayerExist();
      t.is(players!.length, 4);

      const playersMap = callbacks._runloop?._scopes.byKind("player")!;
      const playersSrv = Array.from(playersMap.values()!) as Player[];
      t.is(playersSrv!.length, 4);

      const gamesMap = callbacks._runloop?._scopes.byKind("game")!;
      const games = Array.from(gamesMap.values()!);
      t.is(games!.length, 2);
      const game1 = games[0]! as Game;
      const game2 = games[1]! as Game;

      let count = 0;
      const distribution = new Map<string, string>();
      for (const player of playersSrv) {
        count++;
        if (count % 2 === 0) {
          distribution.set(player.id, game1.id);
          game1.assignPlayer(player);
        } else {
          distribution.set(player.id, game2.id);
          game2.assignPlayer(player);
        }
        // player.set("introDone", true);
      }

      // console.log(Array.from(distribution.values()));

      for (const player of players) {
        player.player!.set("introDone", true);
      }

      await players.awaitGameExist();
      for (const player of players) {
        t.truthy(player.game!.id);
        t.is(player.game!.id, distribution.get(player.player!.id)!);
      }
    },
    {
      listeners: gameInitCallbacks(),
      disableAssignment: true,
    }
  );
});
