import { Empirica } from "empirica";

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
const stageDuration = 30000;

async function main() {
  try {
    const empirica = new Empirica(url);
    const [admin, _] = await empirica.registerService(
      "callbacks",
      "0123456789123456"
    );

    const players = [];
    const batches = [];

    admin.onNewPlayer(({ player }) => {
      console.log("new player", player);
    });
    admin.onPlayerConnected(({ player }) => {
      console.log("player connected", player);
      if (player.game) {
        return;
      }

      players.push(player);
      if (players.filter((p) => !p.game).length === playerCount) {
        admin.createBatch();
      }
    });
    admin.onPlayerDisconnected(({ player }) => {
      console.log("player disconnected", player);
    });
    admin.onNewBatch(({ batch }) => {
      console.log("new batch");
      batches.push(batch);

      if (players.length === 0 || batches.length === 0) {
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
      for (const player of players.filter((p) => !p.game)) {
        console.log("assign player");
        game.assignPlayer(player);
      }
      game.start();
    });
    admin.onGameInit(({ game }) => {
      console.log("game init");
      for (const player of game.players) {
        player.set("score", 0);
      }
    });
    admin.onRoundStart(({ round }) => {
      console.log("round start");
    });
    admin.onStageStart(({ stage }) => {
      console.log("stage start", stage.id);
      stage.set("hello", 1);
    });
    admin.onStageEnd(({ stage }) => {
      console.log(
        "stage end",
        stage.id,
        stage.round
        // stage.round.game.id,
        // stage.round.game.players.map((p) => p.id),
        // stage.round.game.batch.id
      );
    });
    admin.onRoundEnd(({ round }) => {
      console.log("round end");
    });
    admin.onGameEnd(({ game }) => {
      console.log("game end");
    });
    admin.onChange("player", "readyForAssigment", ({ attr, isNew, player }) => {
      console.log("player readyForAssigment", attr.val, isNew, player);
    });
    admin.onChange(
      "player-stage",
      "submit",
      ({ attr, isNew, player, stage }) => {
        const players = stage.round?.game?.players;
        if (!players) {
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
      }
    );
    admin.onInternalChange("game", "currentStageID", ({ attr, isNew }) => {
      console.log("currentStageID change", attr.val, isNew);
    });

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
