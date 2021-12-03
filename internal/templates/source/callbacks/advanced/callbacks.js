import { Callbacks } from "@empirica/admin";
import { pickRandom, selectRandom } from "./random.js";
import { deepEqual } from "./utils.js";

const Empirica = new Callbacks();

Empirica.onNewPlayer(function ({ player }) {
  console.log("new player", player.id);
});

Empirica.onPlayerConnected(function ({ player }) {
  console.log("player connected", player.id);
  assignplayer(this.batches, player);
});

function assignplayer(batches, player) {
  if (player.currentGame) {
    return;
  }

  for (const batch of batches) {
    if (batch.get("state") !== "running") {
      continue;
    }

    let availableGames = batch.games.filter(
      (g) => !g.get("state") && !g.get("starting")
    );

    if (player.get("treatment")) {
      availableGames = availableGames.filter((g) =>
        deepEqual(g.get("treatment"), player.get("treatment"))
      );
    }

    if (availableGames.length === 0) {
      continue;
    }

    const game = pickRandom(availableGames);
    game.assign(player);
    player.set("treatment", game.get("treatment"));

    return;
  }
}

Empirica.onPlayerDisconnected(function ({ player }) {
  console.log("player disconnected", player.id);
});

Empirica.onNewBatch(function ({ batch }) {
  const conf = batch.get("config");

  if (!conf) {
    console.warn("callbacks: batch created without a config");
    return;
  }

  console.log("new batch", conf);

  if (conf !== Object(conf)) {
    console.warn("callbacks: batch config is not an object");
    return;
  }

  switch (conf.kind) {
    case "simple":
      for (let i = 0; i < conf.config.count; i++) {
        const treatment = pickRandom(conf.config.treatments).factors;
        batch.addGame({ treatment });
      }

      break;
    case "complete":
      for (const t of conf.config.treatments) {
        for (let i = 0; i < t.count; i++) {
          batch.addGame({ treatment: t.treatment.factors });
        }
      }

      break;
    default:
      console.warn("callbacks: batch created without a config");
      return;
  }
});

Empirica.onChange("batch", "state", function ({ isNew, batch }) {
  switch (batch.get("state")) {
    case "running":
      console.debug("callbacks: batch running");

      for (const player of this.unassignedPlayers) {
        assignplayer(this.batches, player);
      }

      break;
    case "ended":
      console.debug("callbacks: batch ended");
      for (const game of batch.games) {
        const state = game.get("state");
        if (state !== "failed" && state !== "ended" && state !== "terminated") {
          game.end("batch ended");
        }
      }

      break;
    case "failed":
      console.debug("callbacks: batch failed");

      for (const game of batch.games) {
        const state = game.get("state");
        if (state !== "failed" && state !== "ended" && state !== "terminated") {
          game.fail("batch failed");
        }
      }

      break;
    case "terminated":
      console.debug("callbacks: batch terminated");

      for (const game of batch.games) {
        const state = game.get("state");
        if (state !== "failed" && state !== "ended" && state !== "terminated") {
          game.terminate("batch terminated");
        }
      }

      break;
    default:
      console.warn(`callbacks: unknown batch state: ${batch.get("state")}`);
      break;
  }
});

function checkBatchEnded(batch) {
  const gamesStileRunning = batch.games.some((g) => {
    const state = g.get("state");
    return !state || state === "running";
  });

  if (!gamesStileRunning) {
    batch.set("state", "ended");
  }
}

Empirica.onChange("game", "state", function ({ isNew, game }) {
  switch (game.get("state")) {
    case "running":
      console.debug("callbacks: game running");
      break;
    case "ended":
      console.debug("callbacks: game ended");
      checkBatchEnded(game.batch);
      break;
    case "failed":
      console.debug("callbacks: game failed");
      checkBatchEnded(game.batch);
      break;
    case "terminated":
      console.debug("callbacks: game terminated");
      checkBatchEnded(game.batch);
      break;
    default:
      console.warn(`callbacks: unknown game state: ${game.get("state")}`);
      break;
  }
});

Empirica.onChange("player", "introDone", function ({ isNew, player }) {
  if (!player.currentGame) {
    console.warn("callbacks: introDone without game");
    return;
  }

  const game = player.currentGame;
  const { playerCount } = game.get("treatment");
  const readyPlayers = game.players.filter((p) => p.get("introDone"));

  if (readyPlayers.length < playerCount) {
    console.debug("callbacks: not enough players ready yet");
    return;
  }

  game.set("starting", true);

  const players = selectRandom(readyPlayers, playerCount);
  for (const plyr of game.players) {
    if (!players.some((p) => p.id === plyr.id)) {
      console.log(
        players.map((p) => p.id),
        plyr.id
      );
      game.unassign(plyr);
    }
  }

  game.start();
});

Empirica.onChange("player", "gameID", function ({ isNew, player }) {
  if (player.get("gameID")) {
    return;
  }

  assignplayer(this.batches, player);
});

Empirica.onChange("player-stage", "submit", function ({ player, stage }) {
  const players = player.currentGame.players;
  if (!players || players.length === 0) {
    console.warn("callbacks: no players onSubmit");
    return;
  }

  if (players.every((p) => p.stage.get("submit"))) {
    stage.end();
  }
});

export default Empirica;
