import { Empirica, Hooks } from "@empirica/admin";

const url = "http://localhost:8882/query";

process.on("SIGHUP", () => {
  process.exit(0);
});

function sleep(dur) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, dur);
  });
}

let quitResolve;
const quit = new Promise((resolve) => {
  quitResolve = resolve;
});

process.on("SIGINT", function () {
  quitResolve();
});

const playerCount = 2;
const stageDuration = 90;

async function main() {
  try {
    const hooks = new Hooks();

    hooks.onNewPlayer(({ player }) => {
      console.log("new player", player.id);
    });
    hooks.onPlayerConnected(function ({ player }) {
      console.log("player connected", player.id);

      console.trace("players", this.unassignedPlayers);

      if (this.unassignedPlayers.length >= playerCount) {
        admin.createBatch();
      }
    });
    hooks.onPlayerDisconnected(({ player }) => {
      console.log("player disconnected", player.id);
    });
    hooks.onNewBatch(function ({ batch }) {
      console.log("new batch");

      if (this.unassignedPlayers.length < playerCount) {
        return;
      }

      const game = batch.addGame({ playerCount: 1 });

      const round = game.addRound();
      round.set("name", "Round 1");
      round.addStage("hello", stageDuration);
      round.addStage("hello2", stageDuration);

      const round2 = game.addRound();
      round2.set("name", "Round 2");
      round2.addStage("hola3", stageDuration);
      round2.addStage("hola4", stageDuration);

      for (const player of this.unassignedPlayers.slice(0, playerCount)) {
        console.log("assign player");
        game.assignPlayer(player);
      }

      game.start();
    });
    hooks.onGameInit(({ game }) => {
      console.log("game init");

      for (const player of game.players) {
        player.set("score", 0);
      }

      console.log("game init done");
    });
    hooks.onRoundStart(({ round }) => {
      console.log("round start");
    });
    hooks.onStageStart(({ stage }) => {
      console.log("stage start");
      stage.set("hello", 1);
    });
    hooks.onStageEnd(({ stage }) => {
      console.log("stage end");
    });
    hooks.onRoundEnd(({ round }) => {
      console.log("round end");
    });
    hooks.onGameEnd(({ game }) => {
      console.log("game end");
    });
    hooks.onChange("player", "readyForAssigment", ({ attr, isNew, player }) => {
      console.log("player readyForAssigment", attr.val, isNew, player);
    });
    hooks.onNew("player-stage", "submit", ({ attr, isNew, player, stage }) => {
      const players = stage.round?.game?.players;
      if (!players) {
        console.warn("no players");
        return;
      }

      const submitted = players.every((p) => p.stage.get("submit"));
      if (submitted) {
        stage.end();
      }

      console.log(
        "player-stage submit",
        submitted
        // // attr.val,
        // // isNew,
        // // player,
        // stage,
        // stage.round,
        // stage.round?.game,
        // stage.round?.game?.players,
        // ,
        // player.stage.get("submit")
      );
    });
    hooks.onChange("game", "currentStageID", ({ attr, isNew }) => {
      console.log("currentStageID change", attr.val, isNew);
    });

    const [admin, _] = await Empirica.registerService(
      url,
      "callbacks",
      "0123456789123456",
      hooks
    );

    // const player = await empirica.register("hellomynameisB");
    // player.onChange((change) => {
    //   // console.log("player change", change);
    // });

    // const player2 = await empirica.register("hellomynameisA");
    // player2.onChange((change) => {
    //   // console.log("player2 change", change);
    // });

    // await sleep(25000);

    // player.stop();

    // console.log(batch);
  } catch (e) {
    console.error(e);
  }

  await quit;
}

(async () => {
  await main();

  process.exit(0);
})();
