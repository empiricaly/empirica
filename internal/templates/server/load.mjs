import { Empirica } from "empirica";

const url = "http://localhost:4737/query";

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

const playerCount = 100;
const stageDuration = 300;

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
      if (players.length === playerCount) {
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
      for (const player of players) {
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
    admin.onChange("game", "ei:currentStageID", ({ attr, isNew }) => {
      console.log("attr", attr.val, isNew);
    });

    for (let i = 0; i < 100; i++) {
      console.log("player", i);
      const [participant, _] = await empirica.registerParticipant(
        `hellomynameis${i}`
      );
      participant.onChange((change) => {
        console.log("player change", change.id);
      });
      let n = 0;

      setInterval(() => {
        participant.player.set("n", n++);
      }, 1000);
    }

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
