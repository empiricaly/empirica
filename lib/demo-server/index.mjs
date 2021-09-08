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

    hooks.onNewPlayer(function ({ player }) {
      console.log("new player", player.id);
    });

    hooks.onPlayerConnected(function ({ player }) {
      console.log("player connected", player.id);

      console.trace(
        "players",
        this.unassignedPlayers.length,
        this.unassignedPlayers.length >= playerCount
      );

      if (this.unassignedPlayers.length >= playerCount) {
        this.createBatch({
          config: {
            kind: "simple",
            treatments: [
              {
                count: 1,
                treatment: {
                  playerCount: 2,
                },
              },
            ],
          },
        });
      }
    });

    hooks.onPlayerDisconnected(function ({ player }) {
      console.log("player disconnected", player.id);
    });

    hooks.onNewBatch(function ({ batch }) {
      console.log("new batch");

      console.log(this);
      console.log(this.unassignedPlayers);
      if (this.unassignedPlayers.length < playerCount) {
        return;
      }

      const game = batch.addGame({ playerCount: 1 });

      for (const player of this.unassignedPlayers.slice(0, playerCount)) {
        console.log("assign player");
        game.assign(player);
      }

      game.start();
    });

    hooks.onGameInit(function ({ game }) {
      console.log("game init");

      for (let i = 0; i < 2; i++) {
        const round = game.addRound({ name: `Round ${i + 1}` });
        round.addStage({ name: "Test", duration: stageDuration });
        round.addStage({ name: "Result", duration: stageDuration });
      }

      for (const player of game.players) {
        player.set("score", 0);
      }

      console.log("game init done");
    });

    hooks.onRoundStart(function ({ round }) {
      console.log("round start");
    });

    hooks.onStageStart(function ({ stage }) {
      console.log("stage start");
      stage.set("hello", 1);
    });

    hooks.onStageEnd(function ({ stage }) {
      console.log("stage end");
    });

    hooks.onRoundEnd(function ({ round }) {
      console.log("round end");
    });

    hooks.onGameEnd(function ({ game }) {
      console.log("game end");
    });

    hooks.onChange(
      "player",
      "readyForAssigment",
      function ({ attr, isNew, player }) {
        console.log("player readyForAssigment", attr.val, isNew, player);
      }
    );

    hooks.onNew(
      "player-stage",
      "submit",
      function ({ attr, isNew, player, stage }) {
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
      }
    );

    hooks.onChange("game", "currentStageID", function ({ attr, isNew }) {
      console.log("currentStageID change", attr.val, isNew);
    });

    const [admin, _] = await Empirica.registerService(
      url,
      "callbacks",
      "0123456789123456",
      hooks
    );
  } catch (e) {
    console.error(e);
  }

  await quit;
}

(async () => {
  await main();

  process.exit(0);
})();
